// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "ds-test/test.sol";
import "../Payments.sol";
import "../AminoToken.sol";

interface HEVM {
    function warp(uint256) external;
    // Set block.timestamp

    function roll(uint256) external;
    // Set block.number

    function fee(uint256) external;
    // Set block.basefee

    function load(address account, bytes32 slot) external returns (bytes32);
    // Loads a storage slot from an address

    function store(address account, bytes32 slot, bytes32 value) external;
    // Stores a value to an address' storage slot

    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
    // Signs data

    function addr(uint256 privateKey) external returns (address);
    // Computes address for a given private key

    function ffi(string[] calldata) external returns (bytes memory);
    // Performs a foreign function call via terminal

    function prank(address) external;
    // Sets the *next* call's msg.sender to be the input address

    function startPrank(address) external;
    // Sets all subsequent calls' msg.sender t be the input address until `stopPrank` is called

    function prank(address, address) external;
    // Sets the *next* call's msg.sender to be the input address, and the tx.origin to be the second input

    function startPrank(address, address) external;
    // Sets all subsequent calls' msg.sender to be the input address until `stopPrank` is called, and the tx.origin to be the second input

    function stopPrank() external;
    // Resets subsequent calls' msg.sender to be `address(this)`

    function deal(address who, uint256 newBalance) external;
    // Sets an address' balance

    function etch(address who, bytes calldata code) external;
    // Sets an address' code

    function expectRevert(bytes calldata) external;
    function expectRevert(bytes4) external;
    // Expects an error on next call

    function record() external;
    // Record all storage reads and writes

    function accesses(address) external returns (bytes32[] memory reads, bytes32[] memory writes);
    // Gets all accessed reads and write slot from a recording session, for a given address

    function expectEmit(bool, bool, bool, bool) external;
    // Prepare an expected log with (bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData).
    // Call this function, then emit an event, then call a function. Internally after the call, we check if
    // logs were emitted in the expected order with the expected topics and data (as specified by the booleans)

    function mockCall(address, bytes calldata, bytes calldata) external;
    // Mocks a call to an address, returning specified data.
    // Calldata can either be strict or a partial match, e.g. if you only
    // pass a Solidity selector to the expected calldata, then the entire Solidity
    // function will be mocked.

    function clearMockedCalls() external;
    // Clears all mocked calls

    function expectCall(address, bytes calldata) external;
    // Expect a call to an address with the specified calldata.
    // Calldata can either be strict or a partial match

    function getCode(string calldata) external returns (bytes memory);
    // Gets the bytecode for a contract in the project given the path to the contract.

    function label(address addr, string calldata label) external;
    // Label an address in test traces

    function assume(bool) external;
    // When fuzzing, generate new inputs if conditional not met
}

contract User {
    Payments internal payments;
	AminoToken internal atm;

    constructor(address payable _payments, address _atm) {
        payments = Payments(_payments);
        atm = AminoToken(_atm);
    }

	function setAtm(address _atm) public {
		atm = AminoToken(_atm);
	}

	function transfer(address to, uint256 value) public {
		atm.transfer(to, value);
	}

	function withdraw(address token) public {
		payments.withdraw(token);
	}

    receive() external payable {}
}

contract PaymentsTest is DSTest {
	HEVM hevm = HEVM(HEVM_ADDRESS);

	// solhint-disable-next-line var-name-mixedcase
    bytes32 private immutable _PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");


	// contracts
    Payments internal payments;
	AminoToken internal atm;

	// users
    User internal owner;
    User internal banker;
    User internal alice;
    User internal bob;

	// EOA users
	address internal testAccount = address(0x003533CD36aC980768B510F5C57E00CE4c0229D5);
	uint256 internal testAccountKey = 0x9cbc61f079e82f0d9d3989a99f5cfe4aef68cbec8063b821fd41e994ea131c79;

    function setUp() public virtual {
        banker = new User(payable(address(payments)), address(atm));
		hevm.prank(address(banker));
		atm = new AminoToken(1000000000);
        payments = new Payments();

		(bool success,) = payable(address(payments)).call{value: 1000 ether}("");
		assertTrue(success);

        owner = new User(payable(address(payments)), address(atm));
        alice = new User(payable(address(payments)), address(atm));
        bob = new User(payable(address(payments)), address(atm));

		// funding
		banker.setAtm(address(atm));
		banker.transfer(address(alice), 100000);
		banker.transfer(address(bob), 100000);
		banker.transfer(address(testAccount), 100000);

		// initialize 
		payments.initialize(42);
		assertTrue(payments.x() == 42);
		payments.transferOwnership(address(owner));
		assertTrue(payments.owner() == address(owner));

		// roll for fun 
		hevm.roll(1);
    }

    function testSpendWithPermit() public {
		uint256 approveValue = 100;
		uint256 spendValue = 50;
		uint256 deadline = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
		bytes32 permitHash = createPermitHash(testAccount, address(payments), approveValue, deadline);
		emit log_named_bytes32("permitHash", permitHash);

		//sign a EIP2612 permit payload
		(uint8 v, bytes32 r, bytes32 s) = hevm.sign(testAccountKey, permitHash);
        address signer = ECDSA.recover(permitHash, v, r, s);
		assertTrue(signer == testAccount);

		// use the signed permit to approve + transfer in one transaction
		hevm.prank(testAccount);
		payments.payWithPermit(address(atm), spendValue, approveValue, deadline, v, r, s);
		assertTrue(atm.nonces(testAccount) == 1);
		assertTrue(atm.balanceOf(address(payments)) == spendValue);
		assertTrue(atm.allowance(testAccount, address(payments)) == approveValue - spendValue);

		// try to spend the rest 
		hevm.prank(testAccount);
		payments.pay(address(atm), spendValue);
		assertTrue(atm.allowance(testAccount, address(payments)) == approveValue - (spendValue + spendValue));
		assertTrue(atm.balanceOf(address(payments)) == (spendValue + spendValue));

		// withdraw to owner 
		owner.withdraw(address(atm));
		assertTrue(atm.balanceOf(address(owner)) == approveValue);
    }

	function testSpend() public {
		uint256 approveValue = 100;
		uint256 spendValue = 50;

		//standard approve transaction
		hevm.prank(testAccount);
		atm.approve(address(payments), approveValue);

		//spend allowance
		hevm.prank(testAccount);
		payments.pay(address(atm), spendValue);
		assertTrue(atm.allowance(testAccount, address(payments)) == approveValue - spendValue);
		assertTrue(atm.balanceOf(address(payments)) == spendValue);
	}

	function createPermitHash(address tokenOwner, address spender, uint256 value, uint256 deadline) public returns (bytes32) {
		uint256 nonce = atm.nonces(tokenOwner);
		emit log_named_uint("tokenOwner nonce", nonce);
		bytes32 structHash = keccak256(abi.encode(
            _PERMIT_TYPEHASH,
            tokenOwner,
            spender,
            value,
            nonce,
            deadline)
		);
		return keccak256(abi.encodePacked("\x19\x01", atm.DOMAIN_SEPARATOR(), structHash));
	}
}
