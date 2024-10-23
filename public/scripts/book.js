document.querySelectorAll('.note-content').forEach(contentElement => {
    const noteElement = contentElement.closest('.note');
    const deleteForm = noteElement.querySelector('.delete-note-form');
    const editForm = noteElement.querySelector('.update-note-form');
    const hiddenInput = editForm.querySelector('.note-content-hidden');

    // When the note content is clicked
    contentElement.addEventListener('click', function() {
        
        // If it has the placeholder text remove it
        if (this.textContent.trim() === 'Click to edit') {
            this.textContent = '';
        }
        
        this.setAttribute('contenteditable', true);
        this.focus();
        // Hides delete button
        deleteForm.style.display = 'none';
    });

    // Handle when user presses Enter or clicks outside to save the note
    contentElement.addEventListener('blur', function() {
        this.setAttribute('contenteditable', 'false');
        // Show delete button again
        deleteForm.style.display = 'block'; 

        if (this.textContent.trim() === '') {
            this.textContent = 'Click to edit';
        }

        // Save the edited content to the hidden input and submit the form
        hiddenInput.value = this.textContent;
        editForm.style.display = 'block'; 
        editForm.submit();
    });

    contentElement.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.blur();
        }
    });

});