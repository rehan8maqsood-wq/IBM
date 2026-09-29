/**
 * GridGuard AI — Grok AI Service
 * Communicates with Grok API using pre-computed deterministic evidence.
 * API key is NEVER sent to the frontend.
 */

const axios = require('axios');

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL = 'grok-3-mini';

/**
 * Build a structured investigation prompt from deterministic evidence
 */
function buildInvestigationPrompt(evidence) {
  const {
    consumerId,
    consumerName,
    meterNumber,
    month,
    metrics,
    anomalies,
    evidenceList,
    riskScore,
    riskLevel,
  } = evidence;

  const anomalyList = anomalies.map(a =>
    `- ${a.type} (${a.severity}): ${a.description}`
  ).join('\n');

  const evidenceLines = evidenceList.map(e => `- ${e}`).join('\n');

  return `You are an expert electricity billing investigator assistant for GridGuard AI. 
Your role is to analyze pre-computed anomaly evidence and provide an investigation report.

IMPORTANT RULES:
1. Do NOT claim fraud is definitively proven — use terms like "suspicious pattern", "anomaly detected", "investigation required"
2. All numerical values are PRE-COMPUTED by deterministic analysis — do NOT invent new numbers
3. Distinguish clearly between: observed evidence, possible explanation, and recommended investigation steps
4. Be objective and professional

=== CONSUMER RECORD ===
Consumer ID: ${consumerId}
Consumer Name: ${consumerName || 'Unknown'}
Meter Number: ${meterNumber}
Month Under Review: ${month}

=== COMPUTED METRICS ===
Historical Average Consumption: ${metrics.historicalAverage} units
Current Actual Consumption (from meter): ${metrics.actualConsumption} units
Billed Units: ${metrics.billedUnits}
Meter vs Bill Difference: ${metrics.meterBillDifference} units
Percentage Deviation from Historical Average: ${metrics.percentageDeviation}%
Historical Standard Deviation: ${metrics.historicalStdDev} units
Previous Anomalous Months: ${metrics.previousAnomalies}
Consecutive Abnormal Periods: ${metrics.consecutiveAbnormalPeriods}
History Available (months): ${metrics.historyMonths}

=== DETECTED ANOMALIES ===
${anomalyList || 'None detected'}

=== NUMERICAL EVIDENCE ===
${evidenceLines || 'No specific evidence flags'}

=== RISK INDICATOR ===
Risk Score: ${riskScore}/100
Risk Level: ${riskLevel}

=== YOUR TASK ===
Provide a structured investigation report with these sections:

1. INVESTIGATION SUMMARY
   A concise professional summary of the suspicious patterns found (2-3 sentences)

2. DETECTED INDICATORS
   List each suspicious indicator with a brief explanation of why it is concerning

3. SUPPORTING EVIDENCE
   For each indicator, cite the specific numerical evidence (use only the values provided above)

4. POSSIBLE ALTERNATIVE EXPLANATIONS
   List legitimate non-fraud explanations that could account for the observed patterns (e.g., long absence, meter replacement, seasonal variation, construction work, etc.)

5. RECOMMENDED VERIFICATION STEPS
   Specific, actionable steps an investigator should take to verify or explain the patterns

6. RISK OBSERVATION
   Your overall risk observation (use: Normal / Requires Monitoring / Investigation Required / High Priority Investigation Required)

Format your response clearly with these exact section headers.`;
}

/**
 * Call Grok API with investigation evidence
 * @param {Object} evidence - structured evidence from anomaly detection
 * @returns {Object} { success, analysis, error }
 */
async function investigateWithGrok(evidence) {
  const apiKey = process.env.GROK_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'PASTE_YOUR_NEW_GROK_KEY_HERE') {
    return {
      success: false,
      error: 'GROK_API_KEY not configured',
      analysis: null,
      fallback: true,
    };
  }

  const prompt = buildInvestigationPrompt(evidence);

  try {
    const response = await axios.post(
      GROK_API_URL,
      {
        model: GROK_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are GridGuard AI investigation assistant. You analyze electricity billing anomalies professionally and objectively, always distinguishing between suspicious patterns and confirmed fraud. You never claim fraud without verified evidence.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const rawContent = response.data?.choices?.[0]?.message?.content || '';
    const parsed = parseGrokResponse(rawContent);

    return {
      success: true,
      analysis: {
        rawContent,
        ...parsed,
      },
      model: GROK_MODEL,
    };
  } catch (err) {
    const errorMessage = err.response?.data?.error?.message || err.message || 'Unknown Grok API error';
    const statusCode = err.response?.status;

    console.error(`Grok API error (${statusCode}):`, errorMessage);

    return {
      success: false,
      error: errorMessage,
      statusCode,
      analysis: null,
      fallback: true,
    };
  }
}

/**
 * Parse structured Grok response into sections
 */
function parseGrokResponse(rawContent) {
  const sections = {
    investigationSummary: '',
    detectedIndicators: [],
    supportingEvidence: [],
    alternativeExplanations: [],
    verificationSteps: [],
    riskObservation: '',
  };

  if (!rawContent) return sections;

  // Extract each section by header
  const extractSection = (text, header, nextHeaders) => {
    const headerRegex = new RegExp(`${header}[\\s\\S]*?\\n([\\s\\S]*?)(?=${nextHeaders.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}|$)`, 'i');
    const match = text.match(headerRegex);
    return match ? match[1].trim() : '';
  };

  const allHeaders = [
    '1\\.\\s*INVESTIGATION SUMMARY',
    '2\\.\\s*DETECTED INDICATORS',
    '3\\.\\s*SUPPORTING EVIDENCE',
    '4\\.\\s*POSSIBLE ALTERNATIVE EXPLANATIONS',
    '5\\.\\s*RECOMMENDED VERIFICATION STEPS',
    '6\\.\\s*RISK OBSERVATION',
  ];

  sections.investigationSummary = extractSection(rawContent, allHeaders[0], allHeaders.slice(1));
  sections.supportingEvidence = extractSection(rawContent, allHeaders[2], allHeaders.slice(3));
  sections.riskObservation = extractSection(rawContent, allHeaders[5], []);

  // Parse list sections
  const parseListSection = (header, nextHeaders) => {
    const text = extractSection(rawContent, header, nextHeaders);
    return text
      .split('\n')
      .map(line => line.replace(/^[-•*\d.]\s*/, '').trim())
      .filter(line => line.length > 5);
  };

  sections.detectedIndicators = parseListSection(allHeaders[1], allHeaders.slice(2));
  sections.alternativeExplanations = parseListSection(allHeaders[3], allHeaders.slice(4));
  sections.verificationSteps = parseListSection(allHeaders[4], allHeaders.slice(5));

  // Fallback: if parsing fails, use raw content in summary
  if (!sections.investigationSummary && rawContent) {
    sections.investigationSummary = rawContent.substring(0, 500);
  }

  return sections;
}

module.exports = { investigateWithGrok };
