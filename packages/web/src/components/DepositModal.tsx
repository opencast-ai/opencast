import React from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useConnect, useConnectors } from "wagmi";
import { formatEther, parseEther } from "viem";

import { useDeposit } from "../hooks/useDeposit";
import { useChainSwitch } from "../hooks/useChainSwitch";
import { Icon } from "./Icon";
import { getExplorerTxUrl } from "../lib/format";
import PaymentABI from "../abi/Payment.json";
import { appChain } from "../lib/wagmi";

// Payment contract address from environment
const PAYMENT_CONTRACT_ADDRESS = import.meta.env.VITE_PAYMENT_CONTRACT_ADDRESS as string | undefined;

// Conversion rate: 1 MON = 100 Coin
const MON_TO_COIN_RATE = 100;

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSuccess: () => void;
}

type DepositStep = "input" | "intent" | "transact" | "confirm" | "success" | "error";

export function DepositModal({ isOpen, onClose, apiKey, onSuccess }: DepositModalProps) {
  // Wallet connection
  const { address, isConnected } = useAccount();
  const connectors = useConnectors();
  const { connect, isPending: isConnecting } = useConnect();

  // Contract interaction
  const {
    writeContract,
    isPending: isWritePending,
    data: hash,
    error: writeError,
    reset: resetWrite
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({
    hash
  });

  // Deposit API hooks
  const { depositIntent, depositConfirm, loading: apiLoading, error: apiError, refresh } = useDeposit(apiKey);

  // Chain switching
  const { isCorrectChain, isSwitching, switchToTargetChain, targetChainId } = useChainSwitch();

  // Local state
  const [monAmount, setMonAmount] = React.useState<string>("");
  const [step, setStep] = React.useState<DepositStep>("input");
  const [requestId, setRequestId] = React.useState<string>("");
  const [txHash, setTxHash] = React.useState<string>("");
  const [error, setError] = React.useState<string>("");

  // Calculate coin amount
  const coinAmount = React.useMemo(() => {
    const mon = parseFloat(monAmount);
    if (!Number.isFinite(mon) || mon <= 0) return 0;
    return Math.floor(mon * MON_TO_COIN_RATE);
  }, [monAmount]);

  // Validate input
  const isValidInput = React.useMemo(() => {
    const mon = parseFloat(monAmount);
    return Number.isFinite(mon) && mon > 0;
  }, [monAmount]);

  // Handle connect wallet
  const handleConnect = () => {
    const connector = connectors.at(0);
    if (connector) {
      connect({ connector });
    } else {
      setError("MetaMask not detected. Please install MetaMask.");
    }
  };

  // Handle start deposit
  const handleStartDeposit = async () => {
    if (!isValidInput) return;

    setError("");
    setStep("intent");

    if (!address) {
      setError("Wallet address not available");
      setStep("error");
      return;
    }

    const result = await depositIntent({ walletAddress: address });
    if (result) {
      setRequestId(result.requestId);
      setStep("transact");
    } else {
      setStep("error");
      setError(apiError || "Failed to create deposit intent");
    }
  };

  // Handle contract deposit
  const handleContractDeposit = async () => {
    if (!PAYMENT_CONTRACT_ADDRESS) {
      setError("Payment contract address not configured");
      setStep("error");
      return;
    }

    // Check and switch chain if needed
    if (!isCorrectChain) {
      setError(`Please switch to ${appChain.name} (Chain ID: ${targetChainId})`);
      const switched = await switchToTargetChain();
      if (!switched) {
        setError(`Failed to switch to ${appChain.name}. Please switch manually in MetaMask.`);
        setStep("error");
        return;
      }
    }

    setError("");

    try {
      const value = parseEther(monAmount);
      writeContract({
        address: PAYMENT_CONTRACT_ADDRESS as `0x${string}`,
        abi: PaymentABI,
        functionName: "deposit",
        value
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to initiate transaction");
      setStep("error");
    }
  };

  // Handle transaction confirmation
  React.useEffect(() => {
    if (isConfirmed && hash) {
      setTxHash(hash);
      setStep("confirm");

      // Call depositConfirm with the txHash
      const monAmountWei = parseEther(monAmount).toString();
      depositConfirm({ requestId, txHash: hash, walletAddress: address!, monAmountWei }).then((result) => {
        if (result) {
          setStep("success");
        } else {
          setStep("error");
          setError(apiError || "Failed to confirm deposit");
        }
      });
    }
  }, [isConfirmed, hash, requestId, depositConfirm, apiError]);

  // Handle errors from write or confirm
  React.useEffect(() => {
    if (writeError) {
      setError(writeError.message);
      setStep("error");
    } else if (confirmError) {
      setError(confirmError.message);
      setStep("error");
    }
  }, [writeError, confirmError]);

  // Reset state when modal closes
  const handleClose = () => {
    setMonAmount("");
    setStep("input");
    setRequestId("");
    setTxHash("");
    setError("");
    resetWrite();
    refresh();
    onClose();
  };

  // Handle success close
  const handleSuccessClose = () => {
    onSuccess();
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-sm border border-border-terminal bg-surface-dark shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-terminal bg-panel-dark">
          <div className="flex items-center gap-2">
            <Icon name="account_balance_wallet" className="text-primary text-xl" />
            <h3 className="text-white font-bold text-sm uppercase tracking-wider font-mono">Deposit MON</h3>
          </div>
          <button onClick={handleClose} className="text-text-dim hover:text-white transition-colors">
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Error display */}
          {(error || apiError) && (
            <div className="p-3 bg-neon-red/10 border border-neon-red/40 text-neon-red text-sm rounded-sm font-mono">
              <div className="flex items-center gap-2">
                <Icon name="error" className="text-sm" />
                <span>{error || apiError}</span>
              </div>
            </div>
          )}

          {/* Step: Input */}
          {step === "input" && (
            <>
              {/* Wallet connection status */}
              {!isConnected ? (
                <div className="space-y-3">
                  <div className="p-4 bg-surface-terminal border border-border-terminal rounded-sm text-center">
                    <Icon name="account_balance_wallet" className="text-text-dim text-3xl mb-2" />
                    <div className="text-text-dim text-sm mb-4">Connect your wallet to deposit MON</div>
                    <button
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="w-full px-4 py-3 bg-primary/10 border border-primary/40 text-primary font-bold text-sm uppercase rounded-sm hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isConnecting ? (
                        <>
                          <Icon name="sync" className="text-sm animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Icon name="link" className="text-sm" />
                          Connect Wallet
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Connected wallet info */}
                  <div className="p-3 bg-neon-green/10 border border-neon-green/40 rounded-sm">
                    <div className="flex items-center gap-2 text-neon-green text-xs font-mono">
                      <Icon name="check_circle" className="text-sm" />
                      <span>Wallet Connected</span>
                    </div>
                    <div className="text-text-dim text-xs font-mono mt-1 truncate">{address}</div>
                  </div>

                  {/* Chain warning */}
                  {!isCorrectChain && (
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

                  {/* MON amount input */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-text-dim uppercase tracking-widest">
                      Amount (MON)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      placeholder="0.00"
                      value={monAmount}
                      onChange={(e) => setMonAmount(e.target.value)}
                      className="w-full rounded-sm bg-surface-terminal border border-border-terminal text-white placeholder-text-dim focus:border-primary focus:ring-0 text-sm font-mono px-3 py-2"
                    />
                  </div>

                  {/* Conversion preview */}
                  {isValidInput && (
                    <div className="p-3 bg-surface-terminal border border-border-terminal rounded-sm">
                      <div className="text-[10px] font-mono text-text-dim uppercase tracking-widest mb-2">
                        Conversion Preview
                      </div>
                      <div className="flex items-center justify-between text-sm font-mono">
                        <span className="text-white">{parseFloat(monAmount).toFixed(4)} MON</span>
                        <Icon name="arrow_forward" className="text-text-dim text-xs" />
                        <span className="text-neon-green font-bold">{coinAmount.toLocaleString()} Coin</span>
                      </div>
                      <div className="text-[10px] text-text-dim mt-1">Rate: 1 MON = 100 Coin</div>
                    </div>
                  )}

                  {/* Deposit button */}
                  <button
                    onClick={handleStartDeposit}
                    disabled={!isValidInput || apiLoading || !isCorrectChain}
                    className="w-full h-10 bg-primary hover:bg-primary-hover transition-colors rounded-sm text-black text-xs font-bold uppercase font-mono tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {apiLoading ? (
                      <>
                        <Icon name="sync" className="text-sm animate-spin" />
                        Preparing...
                      </>
                    ) : (
                      <>
                        <Icon name="arrow_downward" className="text-sm" />
                        Deposit
                      </>
                    )}
                  </button>
                </>
              )}
            </>
          )}

          {/* Step: Intent - Creating deposit intent */}
          {step === "intent" && (
            <div className="py-8 text-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="size-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                </div>
                <div className="size-16 rounded-full bg-surface-terminal border border-border-terminal flex items-center justify-center mx-auto">
                  <Icon name="receipt_long" className="text-primary text-2xl" />
                </div>
              </div>
              <div className="text-white font-mono text-sm">Creating deposit intent...</div>
              <div className="text-text-dim text-xs font-mono">Please wait while we prepare your deposit</div>
            </div>
          )}

          {/* Step: Transact - Send transaction */}
          {step === "transact" && (
            <div className="space-y-4">
              <div className="p-3 bg-surface-terminal border border-border-terminal rounded-sm">
                <div className="text-[10px] font-mono text-text-dim uppercase tracking-widest mb-1">Request ID</div>
                <code className="text-xs text-white font-mono break-all">{requestId}</code>
              </div>

              <div className="p-3 bg-surface-terminal border border-border-terminal rounded-sm">
                <div className="text-[10px] font-mono text-text-dim uppercase tracking-widest mb-1">Amount</div>
                <div className="text-sm text-white font-mono">
                  {parseFloat(monAmount).toFixed(4)} MON ={" "}
                  <span className="text-neon-green">{coinAmount.toLocaleString()} Coin</span>
                </div>
              </div>

              <button
                onClick={handleContractDeposit}
                disabled={isWritePending}
                className="w-full h-10 bg-primary hover:bg-primary-hover transition-colors rounded-sm text-black text-xs font-bold uppercase font-mono tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isWritePending ? (
                  <>
                    <Icon name="sync" className="text-sm animate-spin" />
                    Confirm in Wallet...
                  </>
                ) : (
                  <>
                    <Icon name="send" className="text-sm" />
                    Send Transaction
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step: Confirm - Waiting for confirmation */}
          {step === "confirm" && (
            <div className="py-8 text-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="size-16 rounded-full border-2 border-neon-green/20 border-t-neon-green animate-spin" />
                </div>
                <div className="size-16 rounded-full bg-surface-terminal border border-border-terminal flex items-center justify-center mx-auto">
                  <Icon name="hourglass_empty" className="text-neon-green text-2xl" />
                </div>
              </div>
              <div className="text-white font-mono text-sm">Confirming transaction...</div>
              <div className="text-text-dim text-xs font-mono">Waiting for blockchain confirmation</div>
              {txHash && (
                <a
                  href={getExplorerTxUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:text-primary-hover text-xs font-mono"
                >
                  <Icon name="open_in_new" className="text-xs" />
                  View on Explorer
                </a>
              )}
            </div>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <div className="space-y-4">
              <div className="py-4 text-center">
                <div className="size-16 rounded-full bg-neon-green/10 border border-neon-green/40 flex items-center justify-center mx-auto mb-4">
                  <Icon name="check_circle" className="text-neon-green text-3xl" />
                </div>
                <div className="text-neon-green font-bold font-mono text-lg">Deposit Successful!</div>
                <div className="text-text-dim text-sm font-mono mt-1">
                  {coinAmount.toLocaleString()} Coin has been added to your balance
                </div>
              </div>

              {txHash && (
                <div className="p-3 bg-surface-terminal border border-border-terminal rounded-sm">
                  <div className="text-[10px] font-mono text-text-dim uppercase tracking-widest mb-1">
                    Transaction Hash
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-white font-mono break-all flex-1">{txHash}</code>
                    <a
                      href={getExplorerTxUrl(txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-hover"
                      title="View on Monad Explorer"
                    >
                      <Icon name="open_in_new" className="text-sm" />
                    </a>
                  </div>
                </div>
              )}

              <button
                onClick={handleSuccessClose}
                className="w-full h-10 bg-primary hover:bg-primary-hover transition-colors rounded-sm text-black text-xs font-bold uppercase font-mono tracking-wider"
              >
                Done
              </button>
            </div>
          )}

          {/* Step: Error - Retry option */}
          {step === "error" && (
            <div className="space-y-4">
              <div className="py-4 text-center">
                <div className="size-16 rounded-full bg-neon-red/10 border border-neon-red/40 flex items-center justify-center mx-auto mb-4">
                  <Icon name="error" className="text-neon-red text-3xl" />
                </div>
                <div className="text-neon-red font-bold font-mono text-lg">Deposit Failed</div>
                <div className="text-text-dim text-sm font-mono mt-1">Something went wrong. Please try again.</div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep("input")}
                  className="flex-1 h-10 bg-surface-terminal border border-border-terminal hover:border-primary/40 transition-colors rounded-sm text-white text-xs font-bold uppercase font-mono tracking-wider"
                >
                  Back
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 h-10 bg-primary hover:bg-primary-hover transition-colors rounded-sm text-black text-xs font-bold uppercase font-mono tracking-wider"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-terminal bg-bg-terminal">
          <div className="flex items-center justify-between text-[10px] font-mono text-text-dim">
            <span>MONAD MAINNET</span>
            <span>CHAIN ID: 143</span>
          </div>
        </div>
      </div>
    </div>
  );
}
