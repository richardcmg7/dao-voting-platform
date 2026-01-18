// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DAOVoting.sol";
import "../src/MinimalForwarder.sol";

contract DAOVotingTest is Test {
    DAOVoting public dao;
    MinimalForwarder public forwarder;

    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public user3 = address(0x3);
    address public recipient = address(0x4);

    event FundsDeposited(address indexed user, uint256 amount);
    event ProposalCreated(
        uint256 indexed proposalId, address indexed creator, address recipient, uint256 amount, uint256 deadline
    );
    event Voted(uint256 indexed proposalId, address indexed voter, DAOVoting.VoteType voteType);
    event ProposalExecuted(uint256 indexed proposalId, address recipient, uint256 amount);

    function setUp() public {
        forwarder = new MinimalForwarder();
        dao = new DAOVoting(address(forwarder));

        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
        vm.deal(user3, 100 ether);
    }

    function testFundDAO() public {
        vm.startPrank(user1);
        vm.expectEmit(true, false, false, true);
        emit FundsDeposited(user1, 10 ether);
        dao.fundDAO{value: 10 ether}();
        vm.stopPrank();

        assertEq(dao.getUserBalance(user1), 10 ether);
        assertEq(dao.totalBalance(), 10 ether);
        assertEq(address(dao).balance, 10 ether);
    }

    function testCannotFundZero() public {
        vm.startPrank(user1);
        vm.expectRevert("Must send ETH");
        dao.fundDAO{value: 0}();
        vm.stopPrank();
    }

    function testCreateProposal() public {
        vm.prank(user1);
        dao.fundDAO{value: 10 ether}();

        vm.startPrank(user1);
        uint256 proposalId = dao.createProposal(recipient, 5 ether, 1 days, "Test proposal");
        vm.stopPrank();

        assertEq(proposalId, 1);
        assertEq(dao.proposalCount(), 1);

        DAOVoting.Proposal memory proposal = dao.getProposal(1);
        assertEq(proposal.id, 1);
        assertEq(proposal.recipient, recipient);
        assertEq(proposal.amount, 5 ether);
        assertEq(proposal.description, "Test proposal");
        assertEq(proposal.votesFor, 0);
        assertEq(proposal.votesAgainst, 0);
        assertEq(proposal.executed, false);
    }

    function testCannotCreateProposalWithoutBalance() public {
        vm.prank(user1);
        dao.fundDAO{value: 10 ether}();

        vm.startPrank(user2);
        vm.expectRevert("Insufficient balance to create proposal");
        dao.createProposal(recipient, 5 ether, 1 days, "Test proposal");
        vm.stopPrank();
    }

    function testCannotCreateProposalWithLessThan10Percent() public {
        vm.prank(user1);
        dao.fundDAO{value: 100 ether}();

        vm.prank(user2);
        dao.fundDAO{value: 5 ether}();

        vm.prank(user3);
        dao.fundDAO{value: 5 ether}();

        assertEq(dao.getUserBalance(user3), 5 ether);

        vm.prank(user3);
        dao.fundDAO{value: 5 ether}();

        vm.prank(user3);
        dao.fundDAO{value: 5 ether}();

        vm.startPrank(user2);
        vm.expectRevert("Insufficient balance to create proposal");
        dao.createProposal(recipient, 1 ether, 1 days, "Test proposal");
        vm.stopPrank();
    }

    function testVoteFor() public {
        vm.prank(user1);
        dao.fundDAO{value: 10 ether}();

        vm.prank(user2);
        dao.fundDAO{value: 5 ether}();

        vm.prank(user3);
        dao.fundDAO{value: 5 ether}();

        vm.prank(user3);
        dao.fundDAO{value: 5 ether}();

        vm.prank(user1);
        uint256 proposalId = dao.createProposal(recipient, 5 ether, 1 days, "Test proposal");

        vm.startPrank(user2);
        dao.vote(proposalId, DAOVoting.VoteType.FOR);
        vm.stopPrank();

        DAOVoting.Proposal memory proposal = dao.getProposal(proposalId);
        assertEq(proposal.votesFor, 1);
        assertEq(proposal.votesAgainst, 0);
        assertEq(proposal.votesAbstain, 0);
    }

    function testVoteAgainst() public {
        vm.prank(user1);
        dao.fundDAO{value: 10 ether}();

        vm.prank(user2);
        dao.fundDAO{value: 5 ether}();

        vm.prank(user1);
        uint256 proposalId = dao.createProposal(recipient, 5 ether, 1 days, "Test proposal");

        vm.startPrank(user2);
        dao.vote(proposalId, DAOVoting.VoteType.AGAINST);
        vm.stopPrank();

        DAOVoting.Proposal memory proposal = dao.getProposal(proposalId);
        assertEq(proposal.votesFor, 0);
        assertEq(proposal.votesAgainst, 1);
    }

    function testVoteAbstain() public {
        vm.prank(user1);
        dao.fundDAO{value: 10 ether}();

        vm.prank(user2);
        dao.fundDAO{value: 5 ether}();

        vm.prank(user1);
        uint256 proposalId = dao.createProposal(recipient, 5 ether, 1 days, "Test proposal");

        vm.startPrank(user2);
        dao.vote(proposalId, DAOVoting.VoteType.ABSTAIN);
        vm.stopPrank();

        DAOVoting.Proposal memory proposal = dao.getProposal(proposalId);
        assertEq(proposal.votesAbstain, 1);
    }

    function testChangeVote() public {
        vm.prank(user1);
        dao.fundDAO{value: 10 ether}();

        vm.prank(user2);
        dao.fundDAO{value: 5 ether}();

        vm.prank(user1);
        uint256 proposalId = dao.createProposal(recipient, 5 ether, 1 days, "Test proposal");

        vm.startPrank(user2);
        dao.vote(proposalId, DAOVoting.VoteType.FOR);
        dao.vote(proposalId, DAOVoting.VoteType.AGAINST);
        vm.stopPrank();

        DAOVoting.Proposal memory proposal = dao.getProposal(proposalId);
        assertEq(proposal.votesFor, 0);
        assertEq(proposal.votesAgainst, 1);
    }

    function testCannotVoteWithoutBalance() public {
        vm.prank(user1);
        dao.fundDAO{value: 10 ether}();

        vm.prank(user1);
        uint256 proposalId = dao.createProposal(recipient, 5 ether, 1 days, "Test proposal");

        vm.startPrank(user2);
        vm.expectRevert("Must have balance to vote");
        dao.vote(proposalId, DAOVoting.VoteType.FOR);
        vm.stopPrank();
    }

    function testCannotVoteAfterDeadline() public {
        vm.prank(user1);
        dao.fundDAO{value: 10 ether}();

        vm.prank(user2);
        dao.fundDAO{value: 5 ether}();

        vm.prank(user1);
        uint256 proposalId = dao.createProposal(recipient, 5 ether, 1 days, "Test proposal");

        vm.warp(block.timestamp + 2 days);

        vm.startPrank(user2);
        vm.expectRevert("Voting period has ended");
        dao.vote(proposalId, DAOVoting.VoteType.FOR);
        vm.stopPrank();
    }

    function testExecuteApprovedProposal() public {
        vm.prank(user1);
        dao.fundDAO{value: 10 ether}();

        vm.prank(user2);
        dao.fundDAO{value: 5 ether}();

        vm.prank(user3);
        dao.fundDAO{value: 5 ether}();

        vm.prank(user1);
        uint256 proposalId = dao.createProposal(recipient, 5 ether, 1 days, "Test proposal");

        vm.prank(user1);
        dao.vote(proposalId, DAOVoting.VoteType.FOR);

        vm.prank(user2);
        dao.vote(proposalId, DAOVoting.VoteType.AGAINST);

        vm.prank(user3);
        dao.vote(proposalId, DAOVoting.VoteType.FOR);

        vm.warp(block.timestamp + 1 days + 1 minutes);

        uint256 recipientBalanceBefore = recipient.balance;

        dao.executeProposal(proposalId);

        assertEq(recipient.balance, recipientBalanceBefore + 5 ether);

        DAOVoting.Proposal memory proposal = dao.getProposal(proposalId);
        assertTrue(proposal.executed);
    }

    function testCannotExecuteRejectedProposal() public {
        vm.prank(user1);
        dao.fundDAO{value: 10 ether}();

        vm.prank(user2);
        dao.fundDAO{value: 15 ether}();

        vm.prank(user1);
        uint256 proposalId = dao.createProposal(recipient, 5 ether, 1 days, "Test proposal");

        vm.prank(user1);
        dao.vote(proposalId, DAOVoting.VoteType.FOR);

        vm.prank(user2);
        dao.vote(proposalId, DAOVoting.VoteType.AGAINST);

        vm.warp(block.timestamp + 1 days + 1 minutes);

        vm.expectRevert("Proposal not approved");
        dao.executeProposal(proposalId);
    }

    function testCannotExecuteBeforeDeadline() public {
        vm.prank(user1);
        dao.fundDAO{value: 10 ether}();

        vm.prank(user1);
        uint256 proposalId = dao.createProposal(recipient, 5 ether, 1 days, "Test proposal");

        vm.prank(user1);
        dao.vote(proposalId, DAOVoting.VoteType.FOR);

        vm.expectRevert("Voting period not ended");
        dao.executeProposal(proposalId);
    }

    function testCannotExecuteBeforeExecutionDelay() public {
        vm.prank(user1);
        dao.fundDAO{value: 10 ether}();

        vm.prank(user1);
        uint256 proposalId = dao.createProposal(recipient, 5 ether, 1 days, "Test proposal");

        vm.prank(user1);
        dao.vote(proposalId, DAOVoting.VoteType.FOR);

        vm.warp(block.timestamp + 1 days);

        vm.expectRevert("Execution delay not passed");
        dao.executeProposal(proposalId);
    }

    function testCannotExecuteTwice() public {
        vm.prank(user1);
        dao.fundDAO{value: 10 ether}();

        vm.prank(user1);
        uint256 proposalId = dao.createProposal(recipient, 5 ether, 1 days, "Test proposal");

        vm.prank(user1);
        dao.vote(proposalId, DAOVoting.VoteType.FOR);

        vm.warp(block.timestamp + 1 days + 1 minutes);

        dao.executeProposal(proposalId);

        vm.expectRevert("Proposal already executed");
        dao.executeProposal(proposalId);
    }

    function testCanCreateProposal() public {
        vm.prank(user1);
        dao.fundDAO{value: 10 ether}();

        assertTrue(dao.canCreateProposal(user1));
        assertFalse(dao.canCreateProposal(user2));
    }

    function testIsProposalApproved() public {
        vm.prank(user1);
        dao.fundDAO{value: 10 ether}();

        vm.prank(user2);
        dao.fundDAO{value: 5 ether}();

        vm.prank(user1);
        uint256 proposalId = dao.createProposal(recipient, 5 ether, 1 days, "Test proposal");

        vm.prank(user1);
        dao.vote(proposalId, DAOVoting.VoteType.FOR);

        assertTrue(dao.isProposalApproved(proposalId));

        vm.prank(user2);
        dao.vote(proposalId, DAOVoting.VoteType.AGAINST);

        assertFalse(dao.isProposalApproved(proposalId));
    }

    function testReceiveETH() public {
        vm.prank(user1);
        (bool success,) = address(dao).call{value: 10 ether}("");
        assertTrue(success);

        assertEq(dao.getUserBalance(user1), 10 ether);
        assertEq(address(dao).balance, 10 ether);
    }
}
