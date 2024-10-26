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

// Popup functionality
const openPopup = document.querySelector("#open-add-user");
const closePopup = document.querySelector(".close-popup-svg");
const popup = document.querySelector(".popup");

openPopup.addEventListener('click', () => {
    popup.classList.add("open");
});

closePopup.addEventListener('click', () => {
    popup.classList.remove("open");
});
