from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

tokenizer = AutoTokenizer.from_pretrained("yiyanghkust/finbert-tone")
model = AutoModelForSequenceClassification.from_pretrained("yiyanghkust/finbert-tone")
labels = ["neutral", "bullish", "bearish"]

def analyzeSentiment(texts):
    inputs = tokenizer(texts, padding=True, truncation=True, max_length=512, return_tensors="pt")
    outputs = model(**inputs)
    probability = torch.nn.functional.softmax(outputs.logits, dim=-1)
    predictions = torch.argmax(probability, dim=1)

    results = []
    for i, text in enumerate(texts):
        probs = probability[i].detach().numpy()
        label = labels[predictions[i]]
        results.append({
            "headline": text,
            "sentiment": label,
            "confidence": round(float(max(probs)), 3)
        })
    return results



if __name__ == ("__main__"):
    texts = ["Jensen Huang from Nvidia Annouces split from taiwaniese semiconductor manufactoring stating 'the ceo slept with my wife'",
            "Apple founded technology that was assumed for humans to not reach until the year 5000",
            "Meta CEO new nickname 'Zucc'",
            "Google stock expected to rise 5000%"]
    
    results = analyzeSentiment(texts)
    for r in results:
        print(r)