import yfinance as yf
from flask import request, render_template, jsonify, Flask


app = Flask(__name__, template_folder='templates')


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/get_stock_data', methods=['POST'])
def get_stock_data():
    data = request.get_json()
    ticker = data.get('ticker')
    if ticker:  # Ensure that ticker is not an empty string
        stock = yf.Ticker(ticker)
        try:
            # Fetch data, if available
            data = stock.history(period='1y')
            if data.empty:
                raise ValueError('No data available for this ticker.')
            
            # Send the response with the needed data
            return jsonify({
                'currentPrice': data.iloc[-1].Close,
                'openPrice': data.iloc[-1].Open
            })
        except Exception as e:
            # Log the error and send a response indicating failure
            print(f"Error fetching data for {ticker}: {e}")
            response = jsonify({
                'error': 'Could not retrieve stock data.',
                'details': str(e)
            })
            response.status_code = 500
            return response
    else:
        # Handle the case where no ticker is provided
        return jsonify({'error': 'No ticker symbol provided'}), 400

@app.route('/stock/<ticker>', methods=['GET'])
def stock_detail(ticker):
    stock = yf.Ticker(ticker)
    
    try:
        data = stock.history(period='1d')
        if data.empty:
            raise ValueError("No data available for the specified ticker: " + ticker)

        current_price = data['Close'].iloc[-1] if 'Close' in data else 'N/A'
        open_price = data['Open'].iloc[-1] if 'Open' in data else 'N/A'
        previous_close = data['Close'].iloc[-1] if 'Close' in data else 'N/A'

        info = stock.info
        context = {
            'ticker': ticker.upper(),
            'currentPrice': current_price,
            'openPrice': open_price,
            'previousClose': previous_close,
            'marketCap': info.get('marketCap', 'N/A'),
            'logo_url': info.get('logo_url', '/static/default-logo.png'),
            'companyName': info.get('shortName', ticker),
            'sector': info.get('sector', 'N/A'),
        }

        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify(context)  # Return JSON if it's an AJAX request

        return render_template('stock_detail.html', **context)

    except ValueError as ve:
        print(f"ValueError: {ve}")
        return render_template('error.html', error=str(ve))
    except Exception as e:
        print(f"Unexpected error: {e}")
        return render_template('error.html', error="An unexpected error occurred, please try again later.")




if __name__ == '__main__':
    app.run(debug=True)
