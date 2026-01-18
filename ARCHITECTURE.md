# Architecture Diagrams

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                        (Web Browser)                            │
└────────────┬─────────────────────────────────────────┬──────────┘
             │                                         │
             │ 1. Normal Tx                           │ 2. Meta-Tx (Gasless)
             │ (with gas)                             │ (signature only)
             │                                         │
             ▼                                         ▼
┌──────────────────────┐                    ┌───────────────────────┐
│   MetaMask Wallet    │                    │   Relayer Service     │
│  (User's Account)    │                    │  (API Route/Backend)  │
└──────────┬───────────┘                    └──────────┬────────────┘
           │                                           │
           │ Direct Call                               │ Pays Gas
           │ (Funding, Creating)                       │ (Voting)
           │                                           │
           ▼                                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      ETHEREUM BLOCKCHAIN                         │
│  ┌────────────────────┐          ┌────────────────────────┐     │
│  │ MinimalForwarder   │  EIP-2771│   DAOVoting Contract   │     │
│  │   (EIP-2771)       │◄─────────┤  (ERC2771Context)      │     │
│  │                    │ Forwards │                        │     │
│  │ - verify()         │   with   │ - fundDAO()            │     │
│  │ - execute()        │ original │ - createProposal()     │     │
│  │ - getNonce()       │  sender  │ - vote()               │     │
│  └────────────────────┘          │ - executeProposal()    │     │
│                                   │ - getProposal()        │     │
│                                   └────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
                                           ▲
                                           │
                                           │ Monitors & Executes
                                           │
                                   ┌───────────────────┐
                                   │  Execution Daemon │
                                   │  (Background Job) │
                                   └───────────────────┘
```

## Meta-Transaction Flow (Gasless Voting)

```
┌──────────┐                                                    ┌──────────┐
│  User    │                                                    │ Relayer  │
│ (Voter)  │                                                    │ Service  │
└────┬─────┘                                                    └────┬─────┘
     │                                                               │
     │ 1. Creates vote transaction data                             │
     │    (proposalId, voteType)                                    │
     │                                                               │
     │ 2. Gets current nonce from Forwarder                         │
     ├─────────────────────────────────────┐                        │
     │                                      │                        │
     │ 3. Signs EIP-712 typed data         │                        │
     │    (ForwardRequest + signature)     │                        │
     │◄────────────────────────────────────┘                        │
     │                                                               │
     │ 4. Sends signature to relayer                                │
     ├──────────────────────────────────────────────────────────────►
     │                                                               │
     │                                          5. Validates nonce   │
     │                                             and signature     │
     │                                          ◄─────────────────┐  │
     │                                                            │  │
     │                                          6. Calls execute() │  │
     │                                             on Forwarder   │  │
     │                                          ────────────────┐ │  │
     │                                                          │ │  │
     │                                                          ▼ ▼  │
     │                                               ┌──────────────────┐
     │                                               │ MinimalForwarder │
     │                                               └────────┬─────────┘
     │                                                        │
     │                                          7. Verifies signature
     │                                             Increments nonce
     │                                                        │
     │                                          8. Forwards call with
     │                                             original sender
     │                                             appended to data
     │                                                        │
     │                                                        ▼
     │                                               ┌────────────────┐
     │                                               │  DAOVoting     │
     │                                               │  Contract      │
     │                                               └────────┬───────┘
     │                                                        │
     │                                          9. Extracts original
     │                                             sender from data
     │                                             (_msgSender())
     │                                                        │
     │                                          10. Records vote
     │                                              with user address
     │                                                        │
     │ 11. Returns transaction hash                          │
     │◄──────────────────────────────────────────────────────┤
     │                                                        │
     │ 12. Vote confirmed!                                    │
     │     (No gas paid by user)                             │
     │                                                        │
```

## Proposal Lifecycle

```
┌─────────────────┐
│  CREATED        │  User with ≥10% balance creates proposal
└────────┬────────┘
         │
         │ Voting period starts
         ▼
┌─────────────────┐
│  ACTIVE         │  Users can vote: FOR / AGAINST / ABSTAIN
│  (Voting)       │  Users can change their vote
└────────┬────────┘
         │
         │ Deadline passes
         ▼
    ┌────────────┐
    │ votesFor > │  YES ────────┐
    │ votesAgainst?              │
    └─┬──────────┘               │
      │ NO                       │
      │                          │
      ▼                          ▼
┌─────────────────┐    ┌─────────────────┐
│   REJECTED      │    │  APPROVED       │  Wait execution delay (1 min)
│   (Failed)      │    │  (Pending)      │
└─────────────────┘    └────────┬────────┘
                                │
                                │ Daemon calls executeProposal()
                                ▼
                       ┌─────────────────┐
                       │   EXECUTED      │  Funds transferred to recipient
                       │   (Complete)    │
                       └─────────────────┘
```

## Component Structure (Frontend)

```
App (page.tsx)
├── Web3Provider (Context)
│   ├── Manages wallet connection
│   ├── Provides contract instances
│   └── Tracks account state
│
├── ConnectWallet
│   ├── Connect/Disconnect button
│   └── Display connected address
│
├── FundingPanel
│   ├── Display user balance
│   ├── Display DAO total balance
│   └── Deposit ETH form
│
├── CreateProposal
│   ├── Check if user can create (≥10%)
│   ├── Proposal form (recipient, amount, duration)
│   └── Submit proposal transaction
│
└── ProposalList
    ├── Fetch all proposals
    ├── Display proposal details
    ├── Show vote statistics
    ├── Vote buttons (FOR/AGAINST/ABSTAIN)
    └── Gasless voting via relayer
```

## Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                        CONTRACT STATE                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  proposals: { id, recipient, amount, deadline, votes, ...}  │
│  userBalances: { address => balance }                       │
│  hasVoted: { proposalId => { address => bool } }            │
│  userVotes: { proposalId => { address => VoteType } }       │
│  totalBalance: uint256                                       │
│  proposalCount: uint256                                      │
│                                                              │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   │ Read/Write
                   ▼
         ┌─────────────────────┐
         │   Smart Contract    │
         │     Functions       │
         ├─────────────────────┤
         │ fundDAO()           │◄───── Direct transaction (with gas)
         │ createProposal()    │◄───── Direct transaction (with gas)
         │ vote()              │◄───── Via Forwarder (gasless)
         │ executeProposal()   │◄───── Daemon (automated)
         │ getProposal()       │◄───── Read-only (no gas)
         │ getUserBalance()    │◄───── Read-only (no gas)
         └─────────────────────┘
```

## Security Model

```
┌────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  1. EIP-712 Typed Data Signing                                │
│     └─► Prevents signature reuse across different contracts   │
│                                                                │
│  2. Nonce Management                                           │
│     └─► Each meta-tx has unique nonce                          │
│     └─► Prevents replay attacks                               │
│                                                                │
│  3. Signature Verification                                     │
│     └─► ECDSA signature recovery                              │
│     └─► Ensures request is from actual user                   │
│                                                                │
│  4. Trusted Forwarder                                          │
│     └─► Only trusted forwarder can call                        │
│     └─► Original sender extracted from calldata               │
│                                                                │
│  5. Execution Delay                                            │
│     └─► 1 minute wait after deadline                          │
│     └─► Provides safety window                                │
│                                                                │
│  6. Balance Requirements                                       │
│     └─► 10% minimum to create proposals                       │
│     └─► Prevents spam                                         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

These diagrams illustrate the complete architecture of the DAO Voting Platform with gasless transactions.
