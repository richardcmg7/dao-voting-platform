// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MinimalForwarder.sol";
import "../src/DAOVoting.sol";

contract MinimalForwarderTest is Test {
    MinimalForwarder public forwarder;
    DAOVoting public dao;

    uint256 public user1PrivateKey = 0x1234;
    address public user1;
    address public recipient = address(0x5);

    function setUp() public {
        user1 = vm.addr(user1PrivateKey);
        vm.deal(user1, 100 ether);

        forwarder = new MinimalForwarder();
        dao = new DAOVoting(address(forwarder));
    }

    function testGetNonce() public {
        assertEq(forwarder.getNonce(user1), 0);
    }

    function testExecuteMetaTx() public {
        vm.prank(user1);
        dao.fundDAO{value: 10 ether}();

        bytes memory data = abi.encodeWithSelector(
            dao.createProposal.selector, recipient, 5 ether, 1 days, "Meta-tx proposal"
        );

        MinimalForwarder.ForwardRequest memory request = MinimalForwarder.ForwardRequest({
            from: user1,
            to: address(dao),
            value: 0,
            gas: 1000000,
            nonce: forwarder.getNonce(user1),
            data: data
        });

        bytes32 digest = _getDigest(request);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(user1PrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        assertTrue(forwarder.verify(request, signature));

        (bool success,) = forwarder.execute(request, signature);
        assertTrue(success);

        assertEq(forwarder.getNonce(user1), 1);
        assertEq(dao.proposalCount(), 1);
    }

    function testVerifyInvalidSignature() public {
        bytes memory data = abi.encodeWithSelector(
            dao.createProposal.selector, recipient, 5 ether, 1 days, "Meta-tx proposal"
        );

        MinimalForwarder.ForwardRequest memory request = MinimalForwarder.ForwardRequest({
            from: user1,
            to: address(dao),
            value: 0,
            gas: 1000000,
            nonce: forwarder.getNonce(user1),
            data: data
        });

        uint256 wrongPrivateKey = 0x9999;
        bytes32 digest = _getDigest(request);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongPrivateKey, digest);
        bytes memory wrongSignature = abi.encodePacked(r, s, v);

        assertFalse(forwarder.verify(request, wrongSignature));
    }

    function testCannotExecuteWithWrongNonce() public {
        vm.prank(user1);
        dao.fundDAO{value: 10 ether}();

        bytes memory data = abi.encodeWithSelector(
            dao.createProposal.selector, recipient, 5 ether, 1 days, "Meta-tx proposal"
        );

        MinimalForwarder.ForwardRequest memory request = MinimalForwarder.ForwardRequest({
            from: user1,
            to: address(dao),
            value: 0,
            gas: 1000000,
            nonce: 999,
            data: data
        });

        bytes32 digest = _getDigest(request);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(user1PrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        assertFalse(forwarder.verify(request, signature));

        vm.expectRevert("MinimalForwarder: signature does not match request");
        forwarder.execute(request, signature);
    }

    function testVoteViaMetaTx() public {
        vm.prank(user1);
        dao.fundDAO{value: 10 ether}();

        vm.prank(user1);
        uint256 proposalId = dao.createProposal(recipient, 5 ether, 1 days, "Test proposal");

        bytes memory data = abi.encodeWithSelector(dao.vote.selector, proposalId, DAOVoting.VoteType.FOR);

        MinimalForwarder.ForwardRequest memory request = MinimalForwarder.ForwardRequest({
            from: user1,
            to: address(dao),
            value: 0,
            gas: 1000000,
            nonce: forwarder.getNonce(user1),
            data: data
        });

        bytes32 digest = _getDigest(request);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(user1PrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        (bool success,) = forwarder.execute(request, signature);
        assertTrue(success);

        DAOVoting.Proposal memory proposal = dao.getProposal(proposalId);
        assertEq(proposal.votesFor, 1);
        assertEq(proposal.description, "Test proposal");
    }

    function _getDigest(MinimalForwarder.ForwardRequest memory request) internal view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)"),
                request.from,
                request.to,
                request.value,
                request.gas,
                request.nonce,
                keccak256(request.data)
            )
        );

        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("MinimalForwarder"),
                keccak256("1"),
                block.chainid,
                address(forwarder)
            )
        );

        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }
}
