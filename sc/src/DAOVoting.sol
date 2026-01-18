// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC2771Context} from "../lib/openzeppelin-contracts/contracts/metatx/ERC2771Context.sol";

contract DAOVoting is ERC2771Context { 
    enum VoteType {
        FOR,
        AGAINST,
        ABSTAIN
    }

    struct Proposal {
        uint256 id;
        address recipient;
        uint256 amount;
        uint256 deadline;
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 votesAbstain;
        bool executed;
        uint256 createdAt;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public userBalances;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => VoteType)) public userVotes;

    uint256 public proposalCount;
    uint256 public totalBalance;
    uint256 public constant PROPOSAL_CREATION_THRESHOLD = 10; // 10% of total balance
    uint256 public constant EXECUTION_DELAY = 1 minutes; // Safety period after deadline

    event FundsDeposited(address indexed user, uint256 amount);
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed creator,
        address recipient,
        uint256 amount,
        uint256 deadline,
        string description
    );
    event Voted(uint256 indexed proposalId, address indexed voter, VoteType voteType);
    event ProposalExecuted(uint256 indexed proposalId, address recipient, uint256 amount);

    constructor(address forwarder) ERC2771Context(forwarder) {} // Corrected: Removed extra space before (

    function fundDAO() external payable {
        require(msg.value > 0, "Must send ETH");
        userBalances[_msgSender()] += msg.value;
        totalBalance += msg.value;
        emit FundsDeposited(_msgSender(), msg.value);
    }

    function createProposal(address _recipient, uint256 _amount, uint256 _votingDuration, string calldata _description)
        external
        returns (uint256)
    {
        require(_recipient != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be greater than 0");
        require(_votingDuration > 0, "Duration must be greater than 0");
        require(_amount <= address(this).balance, "Insufficient DAO balance");

        address sender = _msgSender();
        require(
            userBalances[sender] * 100 >= totalBalance * PROPOSAL_CREATION_THRESHOLD,
            "Insufficient balance to create proposal"
        );

        proposalCount++;
        uint256 deadline = block.timestamp + _votingDuration;

        proposals[proposalCount] = Proposal({
            id: proposalCount,
            recipient: _recipient,
            amount: _amount,
            deadline: deadline,
            description: _description,
            votesFor: 0,
            votesAgainst: 0,
            votesAbstain: 0,
            executed: false,
            createdAt: block.timestamp
        });

        emit ProposalCreated(proposalCount, sender, _recipient, _amount, deadline, _description);
        return proposalCount;
    }

    function vote(uint256 _proposalId, VoteType _voteType) external {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp < proposal.deadline, "Voting period has ended");
        require(!proposal.executed, "Proposal already executed");

        address voter = _msgSender();
        require(userBalances[voter] > 0, "Must have balance to vote");

        if (hasVoted[_proposalId][voter]) {
            VoteType oldVote = userVotes[_proposalId][voter];
            if (oldVote == VoteType.FOR) {
                proposal.votesFor -= 1;
            } else if (oldVote == VoteType.AGAINST) {
                proposal.votesAgainst -= 1;
            } else {
                proposal.votesAbstain -= 1;
            }
        }

        hasVoted[_proposalId][voter] = true;
        userVotes[_proposalId][voter] = _voteType;

        if (_voteType == VoteType.FOR) {
            proposal.votesFor += 1;
        } else if (_voteType == VoteType.AGAINST) {
            proposal.votesAgainst += 1;
        } else {
            proposal.votesAbstain += 1;
        }

        emit Voted(_proposalId, voter, _voteType);
    }

    function executeProposal(uint256 _proposalId) external {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];

        require(!proposal.executed, "Proposal already executed");
        require(block.timestamp >= proposal.deadline, "Voting period not ended");
        require(block.timestamp >= proposal.deadline + EXECUTION_DELAY, "Execution delay not passed");
        require(proposal.votesFor > proposal.votesAgainst, "Proposal not approved");
        require(address(this).balance >= proposal.amount, "Insufficient contract balance");

        proposal.executed = true;
        
        // Actualizar totalBalance al enviar fondos
        totalBalance -= proposal.amount;

        (bool success,) = proposal.recipient.call{value: proposal.amount}("");
        require(success, "Transfer failed");

        emit ProposalExecuted(_proposalId, proposal.recipient, proposal.amount);
    }

    function getProposal(uint256 _proposalId) external view returns (Proposal memory) {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        return proposals[_proposalId];
    }

    function getUserBalance(address _user) external view returns (uint256) {
        return userBalances[_user];
    }

    function getUserVote(uint256 _proposalId, address _user) external view returns (bool voted, VoteType voteType) {
        voted = hasVoted[_proposalId][_user];
        voteType = userVotes[_proposalId][_user];
    }

    function canCreateProposal(address _user) external view returns (bool) {
        if (totalBalance == 0) return false;
        return userBalances[_user] * 100 >= totalBalance * PROPOSAL_CREATION_THRESHOLD;
    }

    function isProposalApproved(uint256 _proposalId) external view returns (bool) {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        return proposal.votesFor > proposal.votesAgainst;
    }

    function canExecuteProposal(uint256 _proposalId) external view returns (bool) {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];

        return !proposal.executed && block.timestamp >= proposal.deadline + EXECUTION_DELAY
            && proposal.votesFor > proposal.votesAgainst && address(this).balance >= proposal.amount;
    }

    receive() external payable {
        userBalances[_msgSender()] += msg.value;
        totalBalance += msg.value;
        emit FundsDeposited(_msgSender(), msg.value);
    }
}
