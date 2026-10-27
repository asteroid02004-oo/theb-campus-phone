(() => {
  const root=document.documentElement,screen=document.getElementById('screen');
  if(!screen)return;
  let pending=0;
  const set=(el,name,value)=>{if(el.style.getPropertyValue(name)!==value)el.style.setProperty(name,value)};
  function sync(){
    pending=0;
    const view=window.visualViewport,unscaled=!view||Math.abs(view.scale-1)<.05;
    const height=Math.max(1,unscaled&&view?view.height:window.innerHeight);
    const top=unscaled&&view?Math.max(0,view.offsetTop):0;
    set(root,'--viewport-h',height.toFixed(2)+'px');
    set(root,'--viewport-top',top.toFixed(2)+'px');
    const rect=screen.getBoundingClientRect();
    if(rect.width>0)set(screen,'--phone-u',(rect.width/100).toFixed(5)+'px');
    if(rect.height>0)set(screen,'--phone-v',(rect.height/100).toFixed(5)+'px');
  }
  function schedule(){if(!pending)pending=requestAnimationFrame(sync)}
  sync();
  if(window.ResizeObserver)new ResizeObserver(schedule).observe(screen);
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('orientationchange',schedule,{passive:true});
  window.visualViewport?.addEventListener('resize',schedule,{passive:true});
  window.visualViewport?.addEventListener('scroll',schedule,{passive:true});
  document.addEventListener('focusin',schedule);
  document.addEventListener('focusout',schedule);
})();
