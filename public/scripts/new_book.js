document.getElementById("cover-upload").addEventListener('change', function(event) {
    const file = event.target.files[0]; // Get the first selected file

    if (file) {
        const reader = new FileReader();

        reader.onload = function(e) {
            // Gets the uploaded image data as base 64
            const imageBase64 = e.target.result;

            // Sets the background of the label element to the uploaded image
            const label = document.querySelector('.cover-upload');
            label.style.backgroundImage = `url(${imageBase64})`;

            // Hides the plus button
            document.querySelector('.plus-icon').style.display = 'none';
        }

        // Reads the image file as a Data URL (base64 format)
        reader.readAsDataURL(file);
    }
});