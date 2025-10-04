document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('save-post-btn');
  if (!btn) return;

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    const slug = btn.dataset.slug;

    const res = await fetch(`/posts/${slug}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();

    if (data.saved) btn.textContent = 'ยกเลิกบันทึก';
    else btn.textContent = 'บันทึกโพสต์';
  });
});