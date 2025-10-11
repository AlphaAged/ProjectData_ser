
(function(){
  //ให้แสดงผลเมื่อ DOM รันเสร็จ โดยไม่ต้องรอรีเฟสเว็บ
  function ready(fn){
    if(document.readyState!='loading') fn(); else document.addEventListener('DOMContentLoaded', fn);
  }
  //เมื่อ DOM พร้อมให้เรียก .nav-toggle ในcss และ navLinks ถ้าไม่่พร้อมให้ return
    //หาปุ่มเปิด-ปิดบนเว็บ
  ready(function(){
    const btn = document.querySelector('.nav-toggle');
    const nav = document.getElementById('navLinks');
    if(!btn || !nav) return;
    //ทำให้ css โชว์ เมนูขึ้น
    function open(){
      nav.classList.add('open');
      btn.setAttribute('aria-expanded','true');
      const first = nav.querySelector('a,button,input');
      if(first) first.focus();
    }
    //ปิดเมนู
    function close(){
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded','false');
      btn.focus();
    }
    //เมื่อกดปุ่มจะเช็คสถานะ ถ้าเปิดอยู่จะปิด ถ้าปิดอยู่จะเปิด
    btn.addEventListener('click', function(e){
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      if(expanded) close(); else open();
    });
    //ถ้ากด esc จะปิดเมนู
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && nav.classList.contains('open')) close();
    });
    //ถ้ากดนอกเมนูจะปิดเมนู (เฉพาะจอเล็ก)
    document.addEventListener('click', function(e){
      if(window.innerWidth > 720) return;
      if(!nav.contains(e.target) && !btn.contains(e.target)){
        if(nav.classList.contains('open')) close();
      }
    });
  });
})();
//เกี่ยวกับ burger menu ให้มีการเช็คในกรณีต่างๆและแสดงผล