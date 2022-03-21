// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "openzeppelin-contracts/token/ERC20/ERC20.sol";
import "openzeppelin-contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

contract AminoToken is ERC20("Test Token", "TTT"), ERC20Permit("Test Token") {
	constructor(uint256 supply) {
        _mint(msg.sender, supply);
	}
}
