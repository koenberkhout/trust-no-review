import numpy as np
import pandas as pd
import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from simpletransformers.classification import ClassificationModel, ClassificationArgs
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC
from functools import lru_cache
import hashlib
from fastapi import Depends
from typing import Dict


def init_old_model():
    global pipe
    df = pd.read_csv("../dataset.csv", header=None, skiprows=1, names=['category', 'rating', 'label', 'text'])
    df['target'] = np.where(df['label'] == 'CG', 1, 0)
    df['text'] = df['text'].str.replace('\n', ' ').str.replace('\s+', ' ', regex=True)
    X = df['text']
    y = df['target']
    X_train, _, y_train, _ = train_test_split(X, y, test_size=0.2, random_state=1, shuffle=True, stratify=None)
    pipe = Pipeline([("tfidf", TfidfVectorizer()), ("clf", LinearSVC())])
    pipe.fit(X_train, y_train)


def init_new_model():
    global model
    model_args = ClassificationArgs(num_train_epochs=4, overwrite_output_dir=False)
    # Load the pre-trained DistilRoBERTa model
    model = ClassificationModel(
        "roberta", "./outputs", args=model_args, use_cuda=torch.cuda.is_available(), num_labels=2
    )


def init_fastapi():
    origins = ["*"]
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


# Initialize components
init_old_model()
init_new_model()
app = FastAPI()
init_fastapi()


@lru_cache()
def get_cache() -> Dict:
    return {}


def process_cache(reviews: list[str], cache: Dict):
    cache_hits, cache_misses = [], []
    for review in reviews:
        review_hash = hashlib.sha512(review.encode('utf-8')).hexdigest()
        if review_hash in cache:
            cache_hits.append((review, cache[review_hash]))
        else:
            cache_misses.append((review, review_hash))

    return cache_hits, cache_misses


@app.post("/classify")
async def classify(reviews: list[str], cache: Dict = Depends(get_cache)) -> list[str]:
    result = {}
    cache_hits, cache_misses = process_cache(reviews, cache)
    if cache_misses:
        predictions, raw_outputs = model.predict([review for review, _ in cache_misses])
        labeled_predictions = ['real' if x == 0 else 'fake' for x in predictions]
        result = {review: prediction for (review, review_hash), prediction in zip(cache_misses, labeled_predictions)}
        cache.update({review_hash: prediction for (_, review_hash), prediction in zip(cache_misses, labeled_predictions)})

    combined_results = {**dict(cache_hits), **result}
    return [combined_results[review] for review in reviews]


@app.post("/classifast")
async def classifast(reviews: list[str], cache: Dict = Depends(get_cache)) -> list[str]:
    result = {}
    cache_hits, cache_misses = process_cache(reviews, cache)
    if cache_misses:
        predictions = pipe.predict([review for review, _ in cache_misses])
        labeled_predictions = ['real' if x == 0 else 'fake' for x in predictions]
        result = {review: prediction for (review, _), prediction in zip(cache_misses, labeled_predictions)}

    combined_results = {**dict(cache_hits), **result}
    return [combined_results[review] for review in reviews]
