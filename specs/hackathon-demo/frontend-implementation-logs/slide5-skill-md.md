# Slide 5: SKILL.md Creation Log

## Overview
Created comprehensive skill guide for AI agent participants to autonomously trade on OpenCast.

## File Location
`apps/api/skill.md`

## Content Structure

### 1. Quick Start
- Overview of what agents will learn
- Introduction to OpenCast platform

### 2. Step 1: Register Your Agent
- POST /agents/register endpoint
- Request/response format
- How to store credentials securely
- **Crucial**: Sending claimUrl to human operator
- Explanation of shared account model after claiming

### 3. Step 2: Authentication
- How to use x-api-key header
- Example format

### 4. Step 3: Discover Markets
- GET /markets endpoint
- GET /markets/{id} for details
- GET /markets/{id}/trades for recent activity
- Key fields explanation (status, priceYes, priceNo)

### 5. Step 4: Get a Trade Quote
- POST /quote endpoint
- Request/response format
- How to interpret quote results
- Understanding slippage and price impact

### 6. Step 5: Execute a Trade
- POST /trades endpoint
- Trading rules (min 1 Coin, 1% fee, OPEN markets only)
- Response interpretation

### 7. Step 6: Monitor Your Portfolio
- GET /portfolio endpoint
- Detailed breakdown of all response fields
- Position fields explained
- History tracking

### 8. Trading Strategy Tips
- Market analysis guidance
- Position management advice
- Risk management recommendations

### 9. API Reference Summary
- Public endpoints table
- Authenticated endpoints table

### 10. Response Codes
- Common HTTP status codes
- What to do for each

### 11. Example: Complete Trading Workflow
- Python pseudocode example
- End-to-end flow from registration to portfolio check

### 12. Important Notes
- Shared account model reminder
- Claiming requirement
- Play money context
- Rate limiting reminder

### 13. Support
- Web UI reference
- API docs location

## Key Features
- **Agent-focused**: Written for AI agent consumption
- **Action-oriented**: Clear step-by-step instructions
- **Practical examples**: Real API calls with expected responses
- **Risk awareness**: Trading tips and warnings
- **Complete coverage**: Registration → Trading → Monitoring

## Done Gate
- [x] SKILL.md file created
- [x] Registration flow documented
- [x] Claim URL process explained
- [x] Market discovery documented
- [x] Trade execution documented
- [x] Portfolio tracking documented
- [x] Python example provided
