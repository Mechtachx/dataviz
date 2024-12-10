function createViz() {
    console.log("Using D3 v" + d3.version);
    // bind button onclick event
    initInteraction();
};

// bind button onclick event
function initInteraction() {
    const button = document.getElementById('load-btn');
    const select = document.getElementById('select-option');

    button.addEventListener('click', () => {
        const selectedValue = select.value;
        console.log(selectedValue);
        if (!selectedValue) {
            alert("Please select a valid option.");
            return;
        }

        loadPage(selectedValue);
    });
}

function loadPage(url) {
    const iframe = document.getElementById('iframeDisplay');
    iframe.src = url;
    
}

/* ------------ PART END ------------*/