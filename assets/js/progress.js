document.addEventListener('scroll', () => {
    const progressBar = document.getElementById('reading-progress-bar');
    if (!progressBar) return;

    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    const scrollPercentage = (scrollTop / (documentHeight - windowHeight)) * 100;
    progressBar.style.width = scrollPercentage + '%';
});
