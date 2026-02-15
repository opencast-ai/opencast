import React from "react";

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, parseUnits } from "viem";

import { Icon } from "./Icon";
import { useWithdraw } from "../hooks/useWithdraw";
import { useChainSwitch } from "../hooks/useChainSwitch";
import { fmtCoin, getExplorerTxUrl } from "../lib/format";
import { appChain } from "../lib/wagmi";

import PaymentAbi from "../abi/Payment.json";
import type { WithdrawRequestResponse } from "../types";

// 100 Coin = 1 MON
const COIN_TO_MON_RATE = 100;

// Payment contract address - from environment or config
const PAYMENT_CONTRACT_ADDRESS = (import.meta.env.VITE_PAYMENT_CONTRACT_ADDRESS as `0x${string}` | undefined) 
  ?? "0x0000000000000000000000000000000000000000" as `0x${string}`;

type WithdrawStep = "input" | "requesting" | "confirming" | "confirmed" | "success";

export function WithdrawModal(props: {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  balanceCoin: number;
  onSuccess: () => void;
}) {
  const { isOpen, onClose, apiKey, balanceCoin, onSuccess } = props;

  const { address: connectedAddress } = useAccount();
  const { request, confirm, loading: apiLoading, error: apiError, withdrawRequest, withdrawConfirm, refresh } = useWithdraw(apiKey);
  const { isCorrectChain, isSwitching, switchToTargetChain, targetChainId } = useChainSwitch();

  const [coinAmount, setCoinAmount] = React.useState<string>("");
  const [walletAddress, setWalletAddress] = React.useState<string>("");
  const [step, setStep] = React.useState<WithdrawStep>("input");
  const [requestData, setRequestData] = React.useState<WithdrawRequestResponse | null>(null);
  const [error, setError] = React.useState<string>("");

  // Contract write
  const {
    writeContract,
    data: txHash,
    isPending: isWritePending,
    error: writeError
  } = useWriteContract();

  // Wait for transaction
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError
  } = useWaitForTransactionReceipt({
    hash: txHash
  });

  // Initialize wallet address when connected
  React.useEffect(() => {
    if (connectedAddress && !walletAddress) {
      setWalletAddress(connectedAddress);
    }
  }, [connectedAddress, walletAddress]);

  // Reset when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setCoinAmount("");
      setWalletAddress(connectedAddress ?? "");
      setStep("input");
      setRequestData(null);
      setError("");
      refresh();
    }
  }, [isOpen, connectedAddress, refresh]);

  // Handle transaction confirmation
  React.useEffect(() => {
    if (isConfirmed && txHash && requestData && step === "confirming") {
      void handleConfirm(txHash);
    }
  }, [isConfirmed, txHash, requestData, step]);

  async function handleConfirm(txHash: `0x${string}`) {
    if (!requestData) return;

    setStep("confirmed");
    const result = await withdrawConfirm({
      requestId: requestData.requestId,
      txHash
    });

    if (result) {
      setStep("success");
      onSuccess();
    } else {
      setStep("input");
      setError(apiError || "Failed to confirm withdraw");
    }
  }

  const coinAmountNum = Number(coinAmount);
  const monAmount = Number.isFinite(coinAmountNum) ? coinAmountNum / COIN_TO_MON_RATE : 0;
  const monAmountWei = Number.isFinite(coinAmountNum) 
    ? parseUnits(monAmount.toString(), 18)
    : 0n;

  const isValidAmount = Number.isFinite(coinAmountNum) && coinAmountNum > 0 && coinAmountNum <= balanceCoin;
  const isValidAddress = walletAddress.startsWith("0x") && walletAddress.length === 42;

  function validateInput(): string | null {
    if (!coinAmountNum || coinAmountNum <= 0) {
      return "Amount must be greater than 0";
    }
    if (coinAmountNum > balanceCoin) {
      return `Insufficient balance. Max: ${fmtCoin(balanceCoin)} Coin`;
    }
    if (!isValidAddress) {
      return "Invalid wallet address";
    }
    if (!connectedAddress) {
      return "Please connect your wallet";
    }
    return null;
  }

  async function handleWithdraw() {
    const validationError = validateInput();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Check and switch chain if needed
    if (!isCorrectChain) {
      setError(`Please switch to ${appChain.name} (Chain ID: ${targetChainId})`);
      const switched = await switchToTargetChain();
      if (!switched) {
        setError(`Failed to switch to ${appChain.name}. Please switch manually in MetaMask.`);
        return;
      }
    }

    setError("");
    setStep("requesting");

    // Step 1: Request withdraw from API
    const result = await withdrawRequest({
      coinAmount: coinAmountNum,
      walletAddress
    });

    if (!result) {
      setStep("input");
      setError(apiError || "Failed to create withdraw request");
      return;
    }

    setRequestData(result);
    setStep("confirming");

    // Step 2: Call contract withdraw
    try {
      writeContract({
        address: PAYMENT_CONTRACT_ADDRESS,
        abi: PaymentAbi,
        functionName: "withdraw",
        args: [result.monAmountWei]
      });
    } catch (e) {
      setStep("input");
      setError(e instanceof Error ? e.message : "Failed to send transaction");
    }
  }



  function handleClose() {
    if (step === "confirming" || step === "confirmed") {
      // Prevent closing while transaction is in progress
      return;
    }
    onClose();
  }

  if (!isOpen) return null;

  const showLoading = step === "requesting" || step === "confirming" || apiLoading || isWritePending || isConfirming;
  const isProcessing = step === "confirming" || step === "confirmed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={!isProcessing ? handleClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-lg border border-border-terminal bg-surface-terminal shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-terminal bg-panel-dark">
          <div className="flex items-center gap-2">
            <Icon name="output" className="text-primary text-xl" />
            <h3 className="text-white font-bold text-sm uppercase tracking-wider font-mono">
              Withdraw to MON
            </h3>
          </div>
          {!isProcessing && (
            <button
              onClick={handleClose}
              className="text-text-dim hover:text-white transition-colors"
            >
              <Icon name="close" className="text-lg" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Error Display */}
          {(error || apiError || writeError || receiptError) && (
            <div className="bg-neon-red/10 border border-neon-red/40 rounded-sm p-3 flex items-start gap-2">
              <Icon name="error" className="text-neon-red text-lg shrink-0 mt-0.5" />
              <div className="text-neon-red text-xs font-mono">
                {error || apiError || writeError?.message || receiptError?.message || "An error occurred"}
              </div>
            </div>
          )}

          {step === "success" ? (
            /* Success State */
            <div className="space-y-4">
              <div className="bg-neon-green/10 border border-neon-green/40 rounded-sm p-4 text-center">
                <Icon name="check_circle" className="text-neon-green text-4xl mx-auto mb-2" />
                <div className="text-white font-bold text-sm uppercase tracking-wider font-mono">
                  Withdrawal Complete
                </div>
                <div className="text-text-dim text-xs font-mono mt-1">
                  Your MON has been sent to your wallet
                </div>
              </div>

              {txHash && (
                <div className="bg-bg-terminal border border-border-terminal rounded-sm p-3">
                  <div className="text-[10px] uppercase tracking-widest text-text-dim mb-1">Transaction Hash</div>
                  <a
                    href={getExplorerTxUrl(txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent-blue font-mono break-all hover:underline flex items-center gap-1"
                  >
                    {txHash}
                    <Icon name="open_in_new" className="text-xs" />
                  </a>
                </div>
              )}

              {confirm && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-bg-terminal border border-border-terminal rounded-sm p-3">
                    <div className="text-[10px] uppercase tracking-widest text-text-dim mb-1">Payment ID</div>
                    <code className="text-xs text-white font-mono break-all">{confirm.paymentId}</code>
                  </div>
                  <div className="bg-bg-terminal border border-border-terminal rounded-sm p-3">
                    <div className="text-[10px] uppercase tracking-widest text-text-dim mb-1">Status</div>
                    <div className="text-sm text-neon-green font-bold font-mono uppercase">{confirm.status}</div>
                  </div>
                </div>
              )}

              <button
                onClick={handleClose}
                className="w-full h-10 bg-primary hover:bg-primary-hover transition-colors rounded-sm text-black text-xs font-bold uppercase font-mono tracking-wider"
              >
                Close
              </button>
            </div>
          ) : (
            /* Input Form */
            <>
              {/* Balance Display */}
              <div className="flex justify-between items-center bg-bg-terminal border border-border-terminal rounded-sm p-3">
                <span className="text-[10px] uppercase tracking-widest text-text-dim">Available Balance</span>
                <span className="text-sm text-white font-bold font-mono">{fmtCoin(balanceCoin)} Coin</span>
              </div>

              {/* Chain Warning */}
              {connectedAddress && !isCorrectChain && (
                <div className="p-3 bg-neon-yellow/10 border border-neon-yellow/40 rounded-sm">
                  <div className="flex items-center gap-2 text-neon-yellow text-xs font-mono mb-2">
                    <Icon name="warning" className="text-sm" />
                    <span>Wrong Network</span>
                  </div>
                  <div className="text-text-dim text-xs font-mono">
                    Please switch to <span className="text-white">{appChain.name}</span> (Chain ID: {targetChainId})
                  </div>
                  <button
                    onClick={switchToTargetChain}
                    disabled={isSwitching}
                    className="mt-2 w-full px-3 py-2 bg-neon-yellow/20 border border-neon-yellow/40 text-neon-yellow text-xs font-bold uppercase font-mono rounded-sm hover:bg-neon-yellow/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSwitching ? (
                      <>
                        <Icon name="sync" className="text-sm animate-spin" />
                        Switching...
                      </>
                    ) : (
                      <>
                        <Icon name="swap_horiz" className="text-sm" />
                        Switch to {appChain.name}
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Coin Amount Input */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[10px] font-mono text-text-dim uppercase tracking-widest">Amount (Coin)</span>
                  <button
                    onClick={() => setCoinAmount(balanceCoin.toString())}
                    className="text-[10px] font-mono text-primary hover:text-primary-hover uppercase"
                    disabled={showLoading}
                  >
                    Max
                  </button>
                </div>
                <input
                  type="number"
                  min={0}
                  step={1}
                  max={balanceCoin}
                  value={coinAmount}
                  onChange={(e) => setCoinAmount(e.target.value)}
                  disabled={showLoading}
                  placeholder="Enter amount..."
                  className="w-full rounded-sm bg-surface-terminal border border-border-terminal text-white placeholder-text-dim focus:border-primary focus:ring-0 text-xs font-mono px-3 py-2.5"
                />
                {coinAmountNum > balanceCoin && (
                  <div className="text-neon-red text-xs font-mono flex items-center gap-1">
                    <Icon name="error" className="text-xs" />
                    Insufficient balance
                  </div>
                )}
              </div>

              {/* Conversion Preview */}
              {isValidAmount && (
                <div className="bg-bg-terminal border border-border-terminal rounded-sm p-3 space-y-2">
                  <div className="text-[10px] uppercase tracking-widest text-text-dim">Conversion Preview</div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white">{fmtCoin(coinAmountNum)} Coin</span>
                    <Icon name="arrow_forward" className="text-text-dim" />
                    <span className="text-neon-green font-bold">{fmtCoin(monAmount)} MON</span>
                  </div>
                  <div className="text-[10px] text-text-dim font-mono">
                    Rate: 100 Coin = 1 MON
                  </div>
                </div>
              )}

              {/* Wallet Address Input */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-text-dim uppercase tracking-widest">Destination Wallet</span>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  disabled={showLoading}
                  placeholder="0x..."
                  className="w-full rounded-sm bg-surface-terminal border border-border-terminal text-white placeholder-text-dim focus:border-primary focus:ring-0 text-xs font-mono px-3 py-2.5"
                />
                {!isValidAddress && walletAddress && (
                  <div className="text-neon-red text-xs font-mono flex items-center gap-1">
                    <Icon name="error" className="text-xs" />
                    Invalid address format
                  </div>
                )}
                {connectedAddress && walletAddress.toLowerCase() !== connectedAddress.toLowerCase() && (
                  <div className="text-amber-500 text-xs font-mono flex items-center gap-1">
                    <Icon name="warning" className="text-xs" />
                    Different from connected wallet
                  </div>
                )}
              </div>

              {/* Transaction Status */}
              {step === "requesting" && (
                <div className="bg-amber-500/10 border border-amber-500/40 rounded-sm p-3 flex items-center gap-2">
                  <Icon name="pending" className="text-amber-500 animate-spin text-lg" />
                  <span className="text-amber-500 text-xs font-mono">Creating withdraw request...</span>
                </div>
              )}

              {step === "confirming" && (
                <div className="bg-accent-blue/10 border border-accent-blue/40 rounded-sm p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon name="pending" className="text-accent-blue animate-spin text-lg" />
                    <span className="text-accent-blue text-xs font-mono">Waiting for transaction confirmation...</span>
                  </div>
                  {txHash && (
                    <a
                      href={getExplorerTxUrl(txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent-blue font-mono break-all hover:underline flex items-center gap-1"
                    >
                      View on Explorer
                      <Icon name="open_in_new" className="text-xs" />
                    </a>
                  )}
                </div>
              )}

              {step === "confirmed" && (
                <div className="bg-neon-green/10 border border-neon-green/40 rounded-sm p-3 flex items-center gap-2">
                  <Icon name="pending" className="text-neon-green animate-spin text-lg" />
                  <span className="text-neon-green text-xs font-mono">Confirming withdrawal...</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={() => void handleWithdraw()}
                disabled={showLoading || !isValidAmount || !isValidAddress || !isCorrectChain}
                className="w-full h-10 bg-primary hover:bg-primary-hover transition-colors rounded-sm text-black text-xs font-bold uppercase font-mono tracking-wider disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {showLoading ? (
                  <>
                    <Icon name="pending" className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Icon name="output" />
                    Withdraw to MON
                  </>
                )}
              </button>

              {/* Help Text */}
              <div className="text-[10px] text-text-dim font-mono text-center">
                You&apos;ll need to confirm the transaction in your wallet
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
