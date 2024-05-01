var tickers = JSON.parse(localStorage.getItem('tickers')) || [];
var lastPrices ={};
var counter= 15;

function startUpdateCycle() {
    updatePrices();
    setInterval(function(){
        counter--;
        $('#counter').text(counter);
        if(counter <= 0){
            updatePrices();
            counter = 15;
        }
    }, 1000)
}

$(document).ready(function(){

    var pathname = window.location.pathname;
    console.log("Current Pathname:", pathname);
    if(window.location.pathname === '/') { // Checks if it's the main page
        tickers.forEach(function(ticker){
            addTickerToGrid(ticker);
        });

    
        updatePrices();
        startUpdateCycle();
    }if(window.location.pathname.startsWith('/stock')) {
        var segments = pathname.split('/');
        var ticker = segments[segments.length - 1] || segments[segments.length - 2]; // Handles trailing slash
        updateSingleStockData(ticker);
    }

    
    
    $('#add-ticker-form').submit(function(e){
        e.preventDefault();
        var newTicker = $('#new-ticker').val().toUpperCase();
        if(!tickers.includes(newTicker)){
            tickers.push(newTicker);
            localStorage.setItem('tickers', JSON.stringify(tickers))
            addTickerToGrid(newTicker);
        }
        $('new-ticker').val('');
        updatePrices();
    });

    $('#tickers-grid').on('click', '.remove-btn', function(){
        var tickerToRemove = $(this).data('ticker');
        tickers = tickers.filter(t => t!== tickerToRemove);
        localStorage.setItem('tickers', JSON.stringify(tickers))
        $(`#${tickerToRemove}`).remove();
    });


});

function addTickerToGrid(ticker){
    $('#tickers-grid').append(`
        <div id="${ticker}" class="stock-box">
            <a href="/stock/${ticker}" class="stock-link">
                <h2>${ticker}</h2>
            </a>
            <p id="${ticker}-price"></p>
            <p id="${ticker}-pct"></p>
            <button class="remove-btn" data-ticker="${ticker}">Remove</button>
        </div>
    `);
}


function updatePrices() {
    tickers.forEach(function (ticker) {
        $.ajax({
            url: '/get_stock_data',
            type: 'POST',
            data: JSON.stringify({ 'ticker': ticker }),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            success: function (data) {
                // Validate data properties
                if (typeof data.currentPrice === "number" && typeof data.openPrice === "number") {
                    var changePercent = ((data.currentPrice - data.openPrice) / data.openPrice) * 100;

                    // Determine color class based on changePercent
                    var colorClass;
                    if (changePercent <= -2) {
                        colorClass = 'dark-red';
                    } else if (changePercent < 0) {
                        colorClass = 'red';
                    } else if (changePercent == 0) {
                        colorClass = 'gray';
                    } else if (changePercent <= 2) {
                        colorClass = 'green';
                    } else {
                        colorClass = 'dark-green';
                    }

                    // Update the DOM elements
                    $(`#${ticker}-price`).text(`$${data.currentPrice.toFixed(2)}`);
                    $(`#${ticker}-pct`).text(`${changePercent.toFixed(2)}%`);
                    $(`#${ticker}-price, #${ticker}-pct`).removeClass('dark-red red green dark-green gray').addClass(colorClass);

                    // Flash effect logic
                    var flashClass = 'gray-flash'; // Default to gray flash
                    if (lastPrices[ticker] > data.currentPrice) {
                        flashClass = 'red-flash';
                    } else if (lastPrices[ticker] < data.currentPrice) {
                        flashClass = 'green-flash';
                    }
                    lastPrices[ticker] = data.currentPrice;

                    $(`#${ticker}`).addClass(flashClass);
                    setTimeout(function () {
                        $(`#${ticker}`).removeClass(flashClass);
                    }, 1000);

                } else {
                    console.error("currentPrice or openPrice is not a number:", { currentPrice: data.currentPrice, openPrice: data.openPrice });
                }
            }
        });
    });
}

function updateSingleStockData(ticker) {
    console.log("Updating data for ticker:", ticker);

    if (!ticker) {
        console.error("Ticker symbol is not provided or is invalid.");
        return;
    }

    $.ajax({
        url: '/stock/' + ticker, // Ensure this endpoint is expecting GET requests.
        type: 'GET',
        dataType: 'json',  // This ensures jQuery expects a JSON response.
        // Correctly pass the ticker as a query parameter, not stringified
        success: function(data) {
            console.log("Received data:", data);
            if (data && typeof data.currentPrice === "number") {
                $('#stockTicker').text(data.companyName + ' (' + ticker.toUpperCase() + ')');
                $('#currentPrice').text(`$${data.currentPrice.toFixed(2)}`);
                var changePercent = calculateChangePercent(data.openPrice, data.currentPrice);
                $('#priceChange').text(changePercent);
                $('#stockDescription').text('Market Cap: $' + formatMarketCap(data.marketCap) + '. Sector: ' + data.sector);
            } else {
                console.error("Invalid data received", data);
                $('#stockTicker').text('Data format error');
            }
        },
        error: function(xhr, status, error) {
            console.error("Error fetching stock data:", xhr.responseText); // Use xhr.responseText to log actual response.
            $('#stockTicker').text('Failed to load stock details');
            $('#currentPrice').text('N/A');
            $('#priceChange').text('N/A');
            $('#stockDescription').text('Error fetching data');
        }
    });
}

function calculateChangePercent(openPrice, currentPrice) {
    let change = ((currentPrice - openPrice) / openPrice) * 100;
    return `${change.toFixed(2)}%`;
}

function formatMarketCap(marketCap) {
    if (marketCap >= 1e12) {
        return (marketCap / 1e12).toFixed(2) + ' Trillion';
    } else if (marketCap >= 1e9) {
        return (marketCap / 1e9).toFixed(2) + ' Billion';
    } else if (marketCap >= 1e6) {
        return (marketCap / 1e6).toFixed(2) + ' Million';
    } else {
        return marketCap.toString();
    }
}
// Use this function on the stock detail page.

