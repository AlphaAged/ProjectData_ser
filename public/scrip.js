/*burger bar*/
document.addEventListener("DOMContentLoaded", () => {
  // ปิด side bar เมื่อขยายหน้าจอเกิน 845px
  window.addEventListener("resize", () => {
    if (window.innerWidth > 845 && sideMenu.style.right === "0px") {
      sideMenu.style.right = "-250px";
    }
  });
  // เกี่ยวกับการเปิดปิด side bar
  const burger = document.getElementById("burger");
  const sideMenu = document.getElementById("sideMenu");
  const closeBtn = document.getElementById("closeBtn");
  //เมื่อกดทำมารเลื่อนเมนูมาจากทางขวา
  burger.addEventListener("click", () => {
    sideMenu.style.right = "0";
  });
  //เมื่อปิดจะเลื่อนกลับไป
  closeBtn.addEventListener("click", () => {
    sideMenu.style.right = "-250px";
  });

  // กดที่ไหนก็ได้ที่ไม่ใช่ sideMenu หรือ burger จะปิด sideMenu
  document.addEventListener("mousedown", (e) => {
    if (
      sideMenu.style.right === "0px" &&
      !sideMenu.contains(e.target) &&
      e.target !== burger
    ) {
      sideMenu.style.right = "-250px";
    }
  });
});

// ออกจากระบบ
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.logout-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        const ok = confirm('ต้องการออกจากระบบหรือไม่?');
        if (ok) {
          const form = btn.closest('form');
          if (form) form.submit();
        }
      });
    });
  });
