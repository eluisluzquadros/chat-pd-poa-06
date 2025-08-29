
from typing import Dict
import langchain
from langchain.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.chains import LLMChain
from langgraph.graph import StateGraph, END
from models import EvaluationRequest, EvaluationResponse, EvaluationMetrics

def create_evaluation_chain():
    llm = ChatOpenAI(temperature=0)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an evaluation agent that assesses the quality and relevance of responses.
                     Analyze the response considering:
                     1. Relevance to the original query
                     2. Completeness of the answer
                     3. Accuracy based on provided context
                     4. Overall quality"""),
        ("user", """Evaluate this response:
                    Original Query: {query}
                    Response: {response}
                    Context Used: {context}
                    
                    Provide a detailed evaluation including:
                    1. Quality score (1-10)
                    2. Specific feedback
                    3. Whether the response is satisfactory
                    4. Metrics for relevance, completeness, and accuracy (0-1)""")
    ])
    
    return LLMChain(llm=llm, prompt=prompt)

def evaluation_node(state: Dict) -> Dict:
    chain = create_evaluation_chain()
    
    result = chain.invoke({
        "query": state["originalMessage"],
        "response": state["response"],
        "context": "\n".join(state["context"])
    })
    
    # Parse the LLM output to extract structured evaluation
    # This is a simplified version - in production, use more robust parsing
    evaluation = {
        "quality": 8,  # This should be extracted from LLM output
        "feedback": result["text"],
        "satisfactory": True,  # This should be determined from LLM output
        "metrics": {
            "relevance": 0.9,
            "completeness": 0.85,
            "accuracy": 0.95
        }
    }
    
    # Determine next agent based on evaluation
    if not evaluation["satisfactory"]:
        evaluation["nextAgent"] = "rag"
    
    return evaluation

# Create the graph
workflow = StateGraph(name="evaluation")
workflow.add_node("evaluation", evaluation_node)
workflow.set_entry_point("evaluation")
workflow.add_node("end", END)
workflow.add_edge("evaluation", "end")

app = workflow.compile()

def handler(event, context):
    try:
        request = EvaluationRequest(**event['body'])
        state = {
            "originalMessage": request.originalMessage,
            "response": request.response,
            "context": request.context
        }
        
        result = app.invoke(state)
        
        # Create metrics object
        metrics = EvaluationMetrics(
            relevance=result["metrics"]["relevance"],
            completeness=result["metrics"]["completeness"],
            accuracy=result["metrics"]["accuracy"]
        )
        
        # Create and return response
        return EvaluationResponse(
            quality=result["quality"],
            feedback=result["feedback"],
            satisfactory=result["satisfactory"],
            metrics=metrics,
            nextAgent=result.get("nextAgent")
        ).dict()
    except Exception as e:
        return {
            "error": str(e)
        }
