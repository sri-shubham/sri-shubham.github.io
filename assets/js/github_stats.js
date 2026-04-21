document.addEventListener('DOMContentLoaded', () => {
    const statsContainer = document.querySelector('.github-stats');
    if (!statsContainer) return;

    const repo = statsContainer.getAttribute('data-repo');
    if (!repo) return;

    fetch(`https://api.github.com/repos/${repo}`)
        .then(response => response.json())
        .then(data => {
            const starEl = document.querySelector('#gh-stars');
            const forkEl = document.querySelector('#gh-forks');
            const langEl = document.querySelector('#gh-language');

            if (starEl) {
                starEl.querySelector('.stat-value').textContent = data.stargazers_count.toLocaleString();
                starEl.classList.remove('loading');
            }
            if (forkEl) {
                forkEl.querySelector('.stat-value').textContent = data.forks_count.toLocaleString();
                forkEl.classList.remove('loading');
            }
            if (langEl) {
                langEl.querySelector('.stat-value').textContent = data.language || 'Code';
                langEl.classList.remove('loading');
            }
        })
        .catch(err => {
            console.error('Error fetching GitHub stats:', err);
            // Hide the container if fetch fails
            statsContainer.style.display = 'none';
        });
});
