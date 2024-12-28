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
    
    // Create tutorial first
    let block = chain.mineBlock([
      Tx.contractCall('craft-nest', 'create-tutorial', [
        types.ascii("Test Tutorial")
      ], deployer.address)
    ]);
    
    const tutorialId = block.receipts[0].result.expectOk().expectUint();
    
    // Vote on tutorial
    let voteBlock = chain.mineBlock([
      Tx.contractCall('craft-nest', 'vote-tutorial', [
        types.uint(tutorialId)
      ], user.address)
    ]);
    
    voteBlock.receipts[0].result.expectOk();
    
    // Check tutorial votes increased
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
  name: "Can create and join collaborative session",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const user = accounts.get('wallet_1')!;
    
    // Create tutorial first
    let tutorialBlock = chain.mineBlock([
      Tx.contractCall('craft-nest', 'create-tutorial', [
        types.ascii("Group Craft")
      ], deployer.address)
    ]);
    
    const tutorialId = tutorialBlock.receipts[0].result.expectOk().expectUint();
    
    // Create session
    let sessionBlock = chain.mineBlock([
      Tx.contractCall('craft-nest', 'create-session', [
        types.uint(tutorialId),
        types.uint(5)
      ], deployer.address)
    ]);
    
    const sessionId = sessionBlock.receipts[0].result.expectOk().expectUint();
    
    // Join session
    let joinBlock = chain.mineBlock([
      Tx.contractCall('craft-nest', 'join-session', [
        types.uint(sessionId)
      ], user.address)
    ]);
    
    joinBlock.receipts[0].result.expectOk();
    
    // Verify session details
    let getSession = chain.callReadOnlyFn(
      'craft-nest',
      'get-session',
      [types.uint(sessionId)],
      deployer.address
    );
    
    const session = getSession.result.expectSome().expectTuple();
    assertEquals(session['registered-count'], types.uint(1));
  },
});