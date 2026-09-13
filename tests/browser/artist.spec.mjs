import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {PNG} from 'pngjs';

const state=page=>page.evaluate(()=>window.neonRiftDiagnostics);
async function open(page){await page.goto('index.html');await page.waitForFunction(()=>window.neonRiftDiagnostics?.ready||window.neonRiftDiagnostics?.error);expect((await state(page)).error).toBe('');await expect(page.locator('#cacheStatus')).toHaveText('Offline ready');}
async function range(page,id,value){await page.locator('#'+id).evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);}
async function kit(page,tab){if(!await page.locator('#controls').isVisible())await page.locator('#settings').click();await page.getByRole('tab',{name:tab,exact:true}).click();}
async function exportPng(page,info,name,size='screen'){
  await kit(page,'Collection');await page.locator('#exportSize').selectOption(size);
  const downloadPromise=page.waitForEvent('download');await page.locator('#exportArt').click();const download=await downloadPromise;
  const path=info.outputPath(name+'.png');await download.saveAs(path);const png=PNG.sync.read(await readFile(path));
  let lit=0,colored=0,opaque=0;for(let i=0;i<png.data.length;i+=4){const [r,g,b,a]=png.data.subarray(i,i+4);if(Math.max(r,g,b)>45)lit++;if(Math.max(r,g,b)-Math.min(r,g,b)>20)colored++;if(a===255)opaque++;}
  expect(lit).toBeGreaterThan(png.width*png.height*.003);expect(colored).toBeGreaterThan(png.width*png.height*.003);expect(opaque).toBe(png.width*png.height);
  console.log(name,JSON.stringify({width:png.width,height:png.height,lit,colored}));return png;
}
test('color, presets, exact saved composition, undo, and PNG artwork',async({page},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);await page.locator('#pause').click();
  const first=await exportPng(page,info,'original');await kit(page,'Color');await range(page,'hue',120);await range(page,'saturation',1.6);
  await page.locator('#colorA').fill('#175cff');await expect(page.locator('#theme')).toHaveValue('4');
  const custom=await exportPng(page,info,'custom');expect(Buffer.compare(first.data,custom.data)).not.toBe(0);
  await kit(page,'Form');await page.locator('#symmetry').selectOption('6');await range(page,'rotation',23);
  const saved=await state(page);await kit(page,'Collection');await page.locator('#lookName').fill('Pocket galaxy');await page.locator('#saveLook').click();
  expect((await state(page)).savedLooks).toBe(1);await page.locator('#surprise').click();expect((await state(page)).settings).not.toEqual(saved.settings);
  await page.locator('#undo').click();expect((await state(page)).settings).toEqual(saved.settings);await page.locator('#redo').click();
  await page.getByRole('button',{name:'Pocket galaxy',exact:true}).click();expect((await state(page)).balls).toEqual(saved.balls);expect((await state(page)).settings).toEqual(saved.settings);
  const high=await exportPng(page,info,'kaleidoscope-2048','2048');expect(Math.max(high.width,high.height)).toBe(2048);
  for(const name of ['Deep ocean','Rose quartz','Solar ink','Prism garden','Silver silence','Molten glass','Midnight mandala','Original']){
    const count=(await state(page)).drawCount;await page.getByRole('button',{name,exact:true}).click();await page.waitForFunction(n=>window.neonRiftDiagnostics.drawCount>n,count);expect((await state(page)).error).toBe('');
  }
  await page.screenshot({path:info.outputPath('collection-mobile.png')});await page.reload();await page.waitForFunction(()=>window.neonRiftDiagnostics?.ready);
  expect((await state(page)).savedLooks).toBe(1);await kit(page,'Collection');await page.getByRole('button',{name:'Pocket galaxy',exact:true}).click();expect((await state(page)).balls).toEqual(saved.balls);expect(errors).toEqual([]);
});
test('installed mode and install events remove installation controls',async({browser})=>{
  const context=await browser.newContext();await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{get:()=>true}));
  const page=await context.newPage();await page.goto('http://127.0.0.1:4173/neon-rift/index.html');await expect(page.locator('#installLink')).toBeHidden();
  await page.goto('http://127.0.0.1:4173/neon-rift/install.html');await expect(page.locator('#installButton')).toBeHidden();await context.close();
});
test('install button transitions and offline relaunch preserve artwork',async({page,context})=>{
  await open(page);await expect(page.locator('#installLink')).toBeVisible();await page.evaluate(()=>dispatchEvent(new Event('appinstalled')));await expect(page.locator('#installLink')).toBeHidden();
  await page.locator('#pause').click();await kit(page,'Color');await range(page,'hue',87);const before=await state(page);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);await page.reload();await page.waitForFunction(()=>window.neonRiftDiagnostics?.ready);
  await expect(page.locator('#installLink')).toBeHidden();expect((await state(page)).settings.hue).toBe(87);expect((await state(page)).balls).toEqual(before.balls);expect((await state(page)).restored).toBe(true);
  await context.setOffline(false);await page.evaluate(()=>dispatchEvent(new Event('beforeinstallprompt',{cancelable:true})));await expect(page.locator('#installLink')).toBeVisible();
});
test('sculpt drag, stillness hold, and cinema mode',async({page})=>{
  await open(page);await kit(page,'Touch');await page.locator('[data-tool=sculpt]').click();expect((await state(page)).settings.paused).toBe(true);await page.locator('#closeSettings').click();
  const before=await state(page);await page.mouse.move(160,360);await page.mouse.down();await page.mouse.move(220,400,{steps:8});await page.mouse.up();expect((await state(page)).balls).not.toEqual(before.balls);expect((await state(page)).time).toBe(before.time);
  await page.locator('#pause').click();await kit(page,'Touch');await page.locator('[data-tool=freeze]').click();await page.locator('#closeSettings').click();
  await page.mouse.move(190,400);await page.mouse.down();const frozen=(await state(page)).time;await page.waitForTimeout(250);expect((await state(page)).time).toBe(frozen);await page.mouse.up();await page.waitForFunction(t=>window.neonRiftDiagnostics.time>t,frozen);
  await page.locator('#cinema').click();await expect(page.locator('.hud')).toBeHidden();await expect(page.locator('#showUI')).toBeVisible();await page.locator('#showUI').click();await expect(page.locator('#settings')).toBeVisible();
});
test('toolkit fits small phones, landscape, and desktop',async({page},info)=>{
  await open(page);await page.locator('#pause').click();
  for(const [width,height]of [[360,640],[390,844],[844,390],[1280,800]]){
    await page.setViewportSize({width,height});await kit(page,'Color');
    for(const tab of ['Color','Form','Touch','Collection']){
      await kit(page,tab);const bounds=await page.locator('#controls').boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(-1);expect(bounds.x+bounds.width).toBeLessThanOrEqual(width+1);expect(bounds.y).toBeGreaterThanOrEqual(-1);expect(bounds.y+bounds.height).toBeLessThanOrEqual(height+1);
      expect(await page.locator('#controls').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
      await page.screenshot({path:info.outputPath(width+'x'+height+'-'+tab+'.png')});
    }
    await page.locator('#exportArt').scrollIntoViewIfNeeded();await expect(page.locator('#exportArt')).toBeInViewport();
  }
});
