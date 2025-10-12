document.addEventListener("DOMContentLoaded", () => {
  // ปุ่มเมื่อกดบันทึกดโพสจะเข้ามาในนี้ 
const btn = document.getElementById("save-post-btn");
  if (btn) {  
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const slug = btn.dataset.slug;

      try {
        //การเรียก api ไปยัง server
        const res = await fetch(`/posts/${slug}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });

        //ตรวจสอบการตอบกลับจาก server
        const data = await res.json();

        if (data.saved) {
          btn.textContent = "ยกเลิกบันทึก";
        } else {
          btn.textContent = "บันทึกโพสต์";
        }
      } catch (err) {
        console.error("Error:", err);
      }
    });
  }});

  //เมื่อกด ยกเลิกการบันทึก
  document.addEventListener("click", async (e) => {
    const unsaveBtn = e.target.closest(".unsave-btn");

    // ถ้าไม่ใช่ปุ่มยกเลิกการบันทึก ให้ข้าม
    if (!unsaveBtn) return;
    //กันรีเฟรชหน้า
    e.preventDefault();
    const slug = unsaveBtn.dataset.slug;
    console.log("unsave clicked", { slug });

    // ตรวจสอบว่ามี slug หรือไม่ถ้าไม่มีให้หยุดทำงาน
    if (!slug) {
      console.error("unsave-btn missing data-slug");
      return;
    }

    //ส่งapiไปยังเซิร์ฟเวอร์เพื่อยกเลิกการบันทึกโพสต์ //เหมือนกับข้างบนแค่ยกเลิกบันทึก
    try {
      const res = await fetch(`/posts/${slug}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin"
      });

      if (!res.ok) {
        console.error("Network response was not ok", res.status, res.statusText);
        return;
      }

      const data = await res.json();
      console.log("unsave response", data);

      if (data.saved === false) {
        // หา <li> ที่ใกล้สุดที่เป็นโพสต์แล้วลบ (fallback ถ้า class ต่างกัน)
        const li = unsaveBtn.closest("li.saved-post") || unsaveBtn.closest("li");
        if (li) {
          li.remove();
        } else {
          // ถ้าไม่เจอ ให้ซ่อนปุ่มเป็น fallback
          unsaveBtn.style.display = "none";
        }
      }
    } catch (err) {
      console.error("Error:", err);
    }
  });

