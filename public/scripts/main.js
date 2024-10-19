function toggleDropdown() {
    const dropdown = document.querySelector('.dropdown-menu');
    dropdown.classList.toggle('show');
}

window.onclick = function(e) {
    if (!e.target.matches('.profile-picture')) {
        const dropdown = document.querySelector('.dropdown-menu');
        if (dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
}