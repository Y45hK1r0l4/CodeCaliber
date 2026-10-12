import axios from "axios"

const CODEBOX_API_URL = (process.env.CODEBOX_API_URL || "http://localhost:3000").replace(/\/$/, "")
const CODEBOX_AUTH_TOKEN = process.env.CODEBOX_AUTH_TOKEN || ""
const MAX_BATCH_SIZE = 20

const codeboxClient = axios.create({
    baseURL: CODEBOX_API_URL,
    headers: {
        "Content-Type": "application/json"
    }
})

codeboxClient.interceptors.request.use((config) => {
    const token = process.env.CODEBOX_AUTH_TOKEN || CODEBOX_AUTH_TOKEN || "dev-token"
    if (token) {
        config.headers["X-Auth-Token"] = token
    }
    return config
})

export const getLanguageById = (lang) =>{
    const language = {
        "c++": 54,
        "java": 62,
        javascript: 63
    }

    return language[lang.toLowerCase()]
}

const chunks = (items, size) => {
    const result = []
    for (let index = 0; index < items.length; index += size) {
        result.push(items.slice(index, index + size))
    }
    return result
}

const getErrorMessage = (error) => (
    error.response?.data?.message || error.response?.data?.error || error.message
)

export const submitBatch = async(submissions)=>{
    if (!Array.isArray(submissions) || submissions.length === 0) {
        throw new Error("At least one submission is required")
    }

    try {
        const responses = await Promise.all(
            chunks(submissions, MAX_BATCH_SIZE).map((batch) =>
                codeboxClient.post("/submissions/batch", {
                    submissions: batch
                })
            )
        )

        return responses.flatMap((response) => response.data)
    } catch (error) {
        throw new Error(`Codebox submission request failed: ${getErrorMessage(error)}`)
    }
}

const waiting = (timer) => new Promise((resolve) => {
    setTimeout(resolve, timer)
})

const fetchResults = async(resultToken) => {
    try {
        const responses = await Promise.all(
            chunks(resultToken, MAX_BATCH_SIZE).map((tokenBatch) =>
                codeboxClient.get("/submissions/batch", {
                    params: {
                        tokens: tokenBatch.join(","),
                        base64_encoded: "false"
                    }
                })
            )
        )

        const submissions = responses.flatMap((response) => response.data?.submissions || [])
        if (submissions.length !== resultToken.length) {
            throw new Error("Codebox returned an incomplete submissions response")
        }

        return submissions
    } catch (error) {
        if (error.message.startsWith("Codebox ")) {
            throw error
        }
        throw new Error(`Codebox result request failed: ${getErrorMessage(error)}`)
    }
}

export const submitToken = async(resultToken) =>{
    if (!Array.isArray(resultToken) || resultToken.length === 0) {
        throw new Error("At least one submission token is required")
    }

    const deadline = Date.now() + 120000

    while(Date.now() < deadline){
        const result = await fetchResults(resultToken)
        const isResultObtained = result.every((submission) => submission.status?.id > 2)

        if(isResultObtained){
            return result.map((submission) => ({
                ...submission,
                status_id: submission.status?.id
            }))
        }

        await waiting(1000)
    }

    throw new Error("Timed out waiting for Codebox results")
}
