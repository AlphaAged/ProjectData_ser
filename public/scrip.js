/*burger bar*/
document.addEventListener("DOMContentLoaded", () => {
  // ปิด side bar เมื่อขยายหน้าจอเกิน 845px
  window.addEventListener("resize", () => {
    if (window.innerWidth > 845 && sideMenu.style.right === "0px") {
      sideMenu.style.right = "-250px";
    }
  });
  const burger = document.getElementById("burger");
  const sideMenu = document.getElementById("sideMenu");
  const closeBtn = document.getElementById("closeBtn");

  burger.addEventListener("click", () => {
    sideMenu.style.right = "0";
  });

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
        e.preventDefault(); // กันไม่ให้ฟอร์มส่งทันที
        const ok = confirm('ต้องการออกจากระบบหรือไม่?');
        if (ok) {
          const form = btn.closest('form');
          if (form) form.submit(); // ส่งฟอร์มถ้าผู้ใช้กดตกลง
        }
        // ถ้ากดยกเลิก ก็ไม่ทำอะไรต่อ
      });
    });
  });
