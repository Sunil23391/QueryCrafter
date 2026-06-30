# Minimal Python API Application Example with MySQL

This guide shows how to create a very small Python API application that connects to a MySQL database and returns data from a table.

## 1. Install dependencies

Install the required Python packages:

```bash
pip install flask mysql-connector-python
```

## 2. Create the MySQL database

If you already have a MySQL database, you can use it directly. Otherwise, create a simple database and table.

Example SQL:

```sql
CREATE DATABASE food_ordering_db;

USE food_ordering_db;

CREATE TABLE menu (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100)
);
```

## 3. Create the Python application

Create a file named `app.py` with the following content:

```python
from flask import Flask, jsonify, request
import mysql.connector

app = Flask(__name__)

@app.route('/menu', methods=['POST'])
def get_menu():
    data = request.get_json() or {}
    query = data.get('query', 'SELECT * FROM menu')

    conn = mysql.connector.connect(
        host='localhost',
        user='root',
        password='',
        database='food_ordering_db'
    )
    cursor = conn.cursor(dictionary=True)
    cursor.execute(query)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({'query': query, 'rows': rows})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
```

### Expected request body

Your application expects a JSON body in this format:

```json
{"query": "SELECT * FROM menu"}
```

This is the same simple shape used by QueryCrafter's connector when it sends a request.

## 4. Run the application

```bash
python app.py
```

Open the endpoint in your browser:

```text
http://127.0.0.1:5000/menu
```

## 5. Insert sample data

You can insert a few sample rows into the `menu` table:

```sql
INSERT INTO menu (name, description, price, category) VALUES
('Burger', 'Tasty grilled burger', 8.99, 'Fast Food'),
('Pizza', 'Cheesy pizza slice', 10.50, 'Italian');
```

## 6. Optional: add a POST endpoint

You can also add a small endpoint to insert new data:

```python
from flask import Flask, jsonify, request
import mysql.connector

app = Flask(__name__)

@app.route('/sql_query', methods=['POST'])
def sql_query():
    data = request.get_json() or {}
    query = data.get('query', 'SELECT * FROM menu')

    conn = mysql.connector.connect(
        host='localhost',
        user='root',
        password='',
        database='food_ordering_db'
    )
    cursor = conn.cursor(dictionary=True)
    cursor.execute(query)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({'query': query, 'rows': rows})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=4228)
```

## 7. Notes

- Replace the MySQL credentials with your own.
- For production use, store database credentials securely.
- Consider using environment variables instead of hardcoding values.

Payload:
{ "query":"SELECT * from menu"}

Url:
http://localhost:4228/menu