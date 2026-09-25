/* 共享测验组件:所有 lesson 的 [data-quiz] 块自动获得点击判分与解析展示 */
document.querySelectorAll('[data-quiz]').forEach(function (quiz) {
  var buttons = quiz.querySelectorAll('button');
  var explain = quiz.querySelector('.explain');
  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      buttons.forEach(function (b) {
        b.classList.toggle('correct', b.dataset.correct === 'true');
        b.classList.toggle('wrong', b === btn && b.dataset.correct === 'false');
      });
      explain.classList.add('show');
    });
  });
});
