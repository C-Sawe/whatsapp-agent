import os
from groq import Groq

def generate_response(user_message: str, inventory_data: list) -> str:
    """
    Generates a conversational response using Groq's Llama model based on the user's message
    and the current inventory data.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return "Internal Error: Groq API key is not configured."
        
    try:
        client = Groq(api_key=api_key)
        
        # Format inventory into a readable string
        inventory_context = "Current Inventory:\n"
        if not inventory_data:
            inventory_context += "Inventory is currently empty."
        else:
            for item in inventory_data:
                item_str = ", ".join([f"{k}: {v}" for k, v in item.items()])
                inventory_context += f"- {item_str}\n"
                
        system_prompt = (
            "You are a friendly, helpful customer service assistant for a store. "
            "You will answer customer inquiries via WhatsApp. "
            "Use the following inventory data to answer the user's question accurately. "
            "If they ask for something not in the inventory, politely inform them we don't have it. "
            "Keep your responses concise and conversational, suitable for a WhatsApp message.\n\n"
            f"{inventory_context}"
        )
        
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        return completion.choices[0].message.content
        
    except Exception as e:
        print(f"Error generating AI response: {e}")
        return "Sorry, our AI assistant encountered an error while processing your request."
