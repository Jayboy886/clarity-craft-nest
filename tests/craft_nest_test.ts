import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "Can create and retrieve tutorial",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const title = "DIY Paper Crafts";
    
    let block = chain.mineBlock([
      Tx.contractCall('craft-nest', 'create-tutorial', [
        types.ascii(title)
      ], deployer.address)
    ]);
    
    block.receipts[0].result.expectOk();
    const tutorialId = block.receipts[0].result.expectOk().expectUint();
    
    let getTutorial = chain.callReadOnlyFn(
      'craft-nest',
      'get-tutorial',
      [types.uint(tutorialId)],
      deployer.address
    );
    
    const tutorial = getTutorial.result.expectSome().expectTuple();
    assertEquals(tutorial['title'], types.ascii(title));
    assertEquals(tutorial['votes'], types.uint(0));
  },
});

Clarinet.test({
  name: "Can vote on tutorial and receive reputation",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const user = accounts.get('wallet_1')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('craft-nest', 'create-tutorial', [
        types.ascii("Test Tutorial")
      ], deployer.address)
    ]);
    
    const tutorialId = block.receipts[0].result.expectOk().expectUint();
    
    let voteBlock = chain.mineBlock([
      Tx.contractCall('craft-nest', 'vote-tutorial', [
        types.uint(tutorialId)
      ], user.address)
    ]);
    
    voteBlock.receipts[0].result.expectOk();
    
    let getTutorial = chain.callReadOnlyFn(
      'craft-nest',
      'get-tutorial',
      [types.uint(tutorialId)],
      deployer.address
    );
    
    const tutorial = getTutorial.result.expectSome().expectTuple();
    assertEquals(tutorial['votes'], types.uint(1));
  },
});

Clarinet.test({
  name: "Can create and join time-limited collaborative session",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const user = accounts.get('wallet_1')!;
    
    let tutorialBlock = chain.mineBlock([
      Tx.contractCall('craft-nest', 'create-tutorial', [
        types.ascii("Group Craft")
      ], deployer.address)
    ]);
    
    const tutorialId = tutorialBlock.receipts[0].result.expectOk().expectUint();
    
    let sessionBlock = chain.mineBlock([
      Tx.contractCall('craft-nest', 'create-session', [
        types.uint(tutorialId),
        types.uint(5),
        types.uint(100)
      ], deployer.address)
    ]);
    
    const sessionId = sessionBlock.receipts[0].result.expectOk().expectUint();
    
    let joinBlock = chain.mineBlock([
      Tx.contractCall('craft-nest', 'join-session', [
        types.uint(sessionId)
      ], user.address)
    ]);
    
    joinBlock.receipts[0].result.expectOk();
    
    let getSession = chain.callReadOnlyFn(
      'craft-nest',
      'get-session',
      [types.uint(sessionId)],
      deployer.address
    );
    
    const session = getSession.result.expectSome().expectTuple();
    assertEquals(session['registered-count'], types.uint(1));
    assertEquals(session['active'], types.bool(true));
  },
});

Clarinet.test({
  name: "Can claim reward for popular tutorial",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const user1 = accounts.get('wallet_1')!;
    
    // Create tutorial
    let createBlock = chain.mineBlock([
      Tx.contractCall('craft-nest', 'create-tutorial', [
        types.ascii("Popular Tutorial")
      ], deployer.address)
    ]);
    
    const tutorialId = createBlock.receipts[0].result.expectOk().expectUint();
    
    // Add 10 votes
    for(let i = 0; i < 10; i++) {
      chain.mineBlock([
        Tx.contractCall('craft-nest', 'vote-tutorial', [
          types.uint(tutorialId)
        ], user1.address)
      ]);
    }
    
    // Claim reward
    let claimBlock = chain.mineBlock([
      Tx.contractCall('craft-nest', 'claim-tutorial-reward', [
        types.uint(tutorialId)
      ], deployer.address)
    ]);
    
    claimBlock.receipts[0].result.expectOk();
    
    // Verify reward claimed
    let getTutorial = chain.callReadOnlyFn(
      'craft-nest',
      'get-tutorial',
      [types.uint(tutorialId)],
      deployer.address
    );
    
    const tutorial = getTutorial.result.expectSome().expectTuple();
    assertEquals(tutorial['reward-claimed'], types.bool(true));
  },
});
