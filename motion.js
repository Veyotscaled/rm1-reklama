export function initMotion({ gsap, ScrollTrigger, Lenis } = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const cursor = document.querySelector('#cursor');
  const label = cursor?.querySelector('.cursor-label');
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.motion-toggle');
  const hero = document.querySelector('.hero');
  const heroBg = hero?.querySelector('.hero-bg');
  const disposers = [];
  const tracks = [...document.querySelectorAll('.marquee-track')].map(track => ({track, window:track.closest('.marquee-window') || track, distance:0, offset:0, visible:true, hovered:false, focused:false}));
  let paused = false, last = 0, previousScroll = window.scrollY, rafId = 0;
  let pointer = {x:innerWidth/2,y:innerHeight/2}, follower = {...pointer}, bg = {x:0,y:0,tx:0,ty:0};
  let heroVisible = true, tickerVisible = true;
  const tickerWindow = document.querySelector('.red-ticker');
  let textTween;
  const on = (target,type,fn,opts) => {if(!target)return;target.addEventListener(type,fn,opts);disposers.push(() => target.removeEventListener(type,fn,opts));};
  const updateHeader = () => header?.classList.toggle('scrolled',window.scrollY>35);
  on(window,'scroll',updateHeader,{passive:true});updateHeader();
  if(reduced){cursor?.classList.remove('is-visible');return () => disposers.forEach(fn => fn());}
  if(gsap && ScrollTrigger)gsap.registerPlugin(ScrollTrigger);
  const lenis = Lenis ? new Lenis({duration:.9,smoothWheel:true,syncTouch:false,anchors:true,prevent:node => node.closest('dialog,#mobile-nav,[data-lenis-prevent]')}) : null;
  if(lenis && ScrollTrigger)lenis.on('scroll',ScrollTrigger.update);
  disposers.push(() => lenis?.destroy());
  on(document,'rm1:overlay',event => {if(event.detail?.open)lenis?.stop();else lenis?.start();});
  const measure = () => {for(const item of tracks){const groups=item.track.querySelectorAll('.marquee-group');item.distance=groups.length>1 ? groups[1].offsetLeft-groups[0].offsetLeft : item.track.scrollWidth/2;}ScrollTrigger?.refresh();};
  measure();on(window,'resize',measure,{passive:true});document.fonts?.ready.then(measure);
  const io=new IntersectionObserver(entries => entries.forEach(entry => {if(entry.target===hero)heroVisible=entry.isIntersecting;if(entry.target===tickerWindow){tickerVisible=entry.isIntersecting;textTween?.paused(paused||document.hidden||!tickerVisible);}tracks.forEach(item => {if(item.window===entry.target)item.visible=entry.isIntersecting;});}),{rootMargin:'80px 0px'});
  if(hero)io.observe(hero);if(tickerWindow)io.observe(tickerWindow);
  tracks.forEach(item => {io.observe(item.window);on(item.window,'pointerenter',() => item.hovered=true);on(item.window,'pointerleave',() => item.hovered=false);on(item.window,'focusin',() => item.focused=true);on(item.window,'focusout',e => item.focused=item.window.contains(e.relatedTarget));});
  disposers.push(() => io.disconnect());
  if(fine && cursor){
    document.body.classList.add('custom-cursor-ready');
    disposers.push(()=>document.body.classList.remove('custom-cursor-ready'));
    on(document,'pointermove',event => {pointer.x=event.clientX;pointer.y=event.clientY;cursor.classList.add('is-visible');const target=event.target instanceof Element ? event.target.closest('[data-cursor]') : null;cursor.classList.toggle('is-active',!!target);if(label)label.textContent=target?.dataset.cursor || '';},{passive:true});
    on(document,'pointerleave',() => cursor.classList.remove('is-visible'));
    on(window,'blur',() => cursor.classList.remove('is-visible'));
  }
  if(fine && heroBg){
    heroBg.style.willChange='transform';heroBg.style.transform='scale(1.035)';
    on(hero,'pointermove',event => {const bounds=hero.getBoundingClientRect();bg.tx=(event.clientX-bounds.left)/bounds.width*24-12;bg.ty=(event.clientY-bounds.top)/bounds.height*24-12;},{passive:true});
    on(hero,'pointerleave',() => {bg.tx=0;bg.ty=0;});
    disposers.push(() => {heroBg.style.removeProperty('transform');heroBg.style.removeProperty('will-change');});
  }
  if(fine && gsap)document.querySelectorAll('.btn,.circle-cta').forEach(button => {
    on(button,'pointermove',event => {const rect=button.getBoundingClientRect();gsap.to(button,{x:Math.max(-5,Math.min(5,(event.clientX-rect.left-rect.width/2)*.06)),y:Math.max(-5,Math.min(5,(event.clientY-rect.top-rect.height/2)*.1)),duration:.3,ease:'power3.out',overwrite:'auto'});},{passive:true});
    on(button,'pointerleave',() => gsap.to(button,{x:0,y:0,duration:.5,ease:'power3.out',clearProps:'transform',overwrite:'auto'}));
    on(button,'blur',() => gsap.set(button,{clearProps:'transform'}));
    disposers.push(() => gsap.killTweensOf(button));
  });
  if(gsap){
    const ticker=document.querySelector('.red-ticker > span');
    if(ticker){
      const original=ticker.innerHTML;
      ticker.style.display='inline-flex';ticker.style.width='max-content';ticker.style.gap='0';
      ticker.innerHTML=`<span class="ticker-copy" style="display:block;padding-right:48px">${original}</span><span class="ticker-copy" aria-hidden="true" style="display:block;padding-right:48px">${original}</span>`;
      textTween=gsap.fromTo(ticker,{xPercent:0,x:0},{xPercent:-50,duration:38,ease:'none',repeat:-1});
      disposers.push(() => {textTween.kill();ticker.innerHTML=original;ticker.removeAttribute('style');});
    }
    const title=document.querySelector('.hero-title');
    let originalTitle;
    if(title){
      originalTitle=title.innerHTML;
      const accessibleTitle=title.innerText.replace(/\s+/g,' ').trim();
      title.setAttribute('aria-label',accessibleTitle);
      title.innerHTML=originalTitle.split(/<br\s*\/?\s*>/i).map(row => `<span class="hero-line" aria-hidden="true" style="display:block;overflow:hidden;color:inherit;padding:.08em .14em .12em 0;margin:-.08em -.14em -.12em 0"><span class="hero-line-ink" style="display:block;transform-origin:left center">${row.replace(/<span(\s|>)/g,'<span style="color:var(--red)"$1')}</span></span>`).join('');
      disposers.push(() => {title.innerHTML=originalTitle;title.removeAttribute('aria-label');});
    }
    const intro=hero?gsap.context(() => {
      gsap.from('.hero-kicker',{y:15,opacity:0,duration:.5,ease:'power3.out'});
      gsap.from('.hero-line-ink',{yPercent:110,rotation:4,duration:.6,stagger:.1,ease:'power3.out',delay:.12,clearProps:'transform'});
      gsap.from('.hero-copy,.hero-actions',{y:20,opacity:0,duration:.6,stagger:.1,ease:'power3.out',delay:.5,clearProps:'transform,opacity'});
    }):null;
    disposers.push(() => intro?.revert());
  }
  on(toggle,'click',() => {paused=!paused;toggle.setAttribute('aria-pressed',String(paused));toggle.innerHTML=paused ? 'Відновити рух <span>↗</span>' : 'Призупинити рух <span>Ⅱ</span>';textTween?.paused(paused||!tickerVisible);document.dispatchEvent(new CustomEvent('rm1:motionchange',{detail:{paused}}));});
  on(document,'visibilitychange',() => {last=0;previousScroll=window.scrollY;if(document.hidden)textTween?.pause();else if(!paused&&tickerVisible)textTween?.resume();});
  const tick=seconds => {
    if(document.hidden)return;
    lenis?.raf(seconds*1000);
    const dt=last ? Math.min(seconds-last,.05) : 0;last=seconds;
    const delta=window.scrollY-previousScroll;previousScroll=window.scrollY;
    if(!paused)for(const item of tracks){if(!item.visible || item.distance<=0 || item.focused)continue;item.offset=(item.offset+dt*(item.hovered?12:42)+delta*.3)%item.distance;if(item.offset<0)item.offset+=item.distance;item.track.style.transform=`translate3d(${-item.offset}px,0,0)`;}
    if(fine && cursor){follower.x+=(pointer.x-follower.x)*.12;follower.y+=(pointer.y-follower.y)*.12;cursor.style.transform=`translate3d(${follower.x}px,${follower.y}px,0) translate(-50%,-50%)`;}
    if(fine && heroBg && heroVisible && !paused && (Math.abs(bg.tx-bg.x)>.01 || Math.abs(bg.ty-bg.y)>.01)){bg.x+=(bg.tx-bg.x)*.08;bg.y+=(bg.ty-bg.y)*.08;heroBg.style.transform=`translate3d(${bg.x}px,${bg.y}px,0) scale(1.035)`;}
  };
  if(gsap){gsap.ticker.add(tick);disposers.push(() => gsap.ticker.remove(tick));}else{const frame=t => {tick(t/1000);rafId=requestAnimationFrame(frame);};rafId=requestAnimationFrame(frame);disposers.push(() => cancelAnimationFrame(rafId));}
  return () => disposers.reverse().forEach(fn => fn());
}
