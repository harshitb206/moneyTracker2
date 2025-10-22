import pickle
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB

# --- Training data ---
texts = [
    "Dominos pizza", "McDonalds burger", "KFC chicken", "Pizza hut", "Starbucks coffee",
    "Uber ride", "Ola cab", "Bus ticket", "Train ticket",
    "Salary June", "Bonus July", "Freelance income",
    "Rent payment", "Apartment rent", "House rent",
    "Movie ticket", "Concert ticket", "Netflix subscription"
]

labels = [
    "Food","Food","Food","Food","Food",
    "Travel","Travel","Travel","Travel",
    "Income","Income","Income",
    "Rent","Rent","Rent",
    "Entertainment","Entertainment","Entertainment"
]

# --- Preprocess: lowercase everything ---
texts = [t.lower() for t in texts]

# --- TF-IDF vectorizer ---
vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(texts)

# --- Train model ---
model = MultinomialNB()
model.fit(X, labels)

# --- Save model & vectorizer ---
with open("model.pkl", "wb") as f:
    pickle.dump((vectorizer, model), f)

print("ML model saved as model.pkl")
