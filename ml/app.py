from flask import Flask, request, jsonify
import pickle

app = Flask(__name__)

# --- Load model & vectorizer ---
with open("model.pkl", "rb") as f:
    vectorizer, model = pickle.load(f)

@app.route("/categorize", methods=["POST"])
def categorize():
    data = request.get_json()
    text = data.get("text", "").lower().strip()  # lowercase + remove whitespace

    if not text:
        return jsonify({"error": "No text provided"}), 400

    X = vectorizer.transform([text])
    category = model.predict(X)[0]

    return jsonify({"category": category})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6000, debug=True)
