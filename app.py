from flask import Flask, render_template, request, jsonify
from ai_engine import generate_sql_tool_call

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate():
    data = request.json
    schema = data.get('schema', '')
    question = data.get('question', '')
    domain = data.get('domain', 'General')

    if not schema or not question:
        return jsonify({"success": False, "error": "Schema and Question are required."})

    # Call the AI engine
    result = generate_sql_tool_call(schema, question, domain)
    
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)