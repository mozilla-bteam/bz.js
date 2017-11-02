import assert from 'assert';
import { createClient } from '../src';
import authConfig from './test-config.json';

describe('test product api', () => {
  let bugzilla;
  
  before(() => {
    bugzilla = createClient(authConfig);
  });
  
  it('should get information about all selectable products', async () => {
    const products = await bugzilla.getProducts('selectable');

    // TODO verify that only selectable bugs are returned
    assert.ok(products.products);
  });
  
  it('should get information about all enterable products', async () => {
    const products = await bugzilla.getProducts('enterable');
    
    // TODO verify that only enterable bugs are returned
    assert.ok(products.products);
  });
  
  it('should get information about all accessible products', async () => {
    const products = await bugzilla.getProducts('accessible');
    
    // TODO verify that only accessible bugs are returned
    assert.ok(products.products);
  });
  
  it('should get information about a specific product by id', async () => {
    const testId = 0;
    const product = await bugzilla.getProduct(testId);
    
    assert.ok(product.products[0].id === testId);
  });
  
  it('should get information about a specific product by name', async () => {
    const testName = "TestProduct";
    const product = await bugzilla.getProduct(testName);
    
    assert.ok(product.products[0].name === testName);
  });
  
  it('should get information about multiple products by id', async () => {
    const testIds = [0, 1, 2];
    const sortedIds = [...testIds].sort((a, b) => a - b);
    const products = await bugzilla.getProducts(testIds);
    const returnedIds = products.products
      .map(({ id }) => id)
      .sort((a, b) => a - b);

    assert.ok(JSON.stringify(returnedIds) === JSON.stringify(sortedIds));
  });

  it('should get information about multiple products by name', async () => {
    const testProductNames = ['TestProduct', 'AnotherTestProduct', 'ThirdTestProduct'];
    const sortedProductNames = [...testProductNames].sort((a, b) => a > b);
    const products = await bugzilla.getProducts(testProductNames);
    const returnedProductNames = products.products
      .map(({ name }) => name)
      .sort((a, b) => a > b);

    assert.ok( JSON.stringify(returnedProductNames) === JSON.stringify(sortedProductNames));
  });
});
