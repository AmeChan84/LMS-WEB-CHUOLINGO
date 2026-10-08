import OpenAI from "openai";

let _client: OpenAI | undefined;

export function getOpenAI() {
  if (_client) return _client;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Please set it in .env.local."
    );
  }
  _client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  return _client;
}

export const AI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export type AIGenerateInput = {
  lessonInfo: {
    title: string;
    subject?: string;
    level?: string;
    date?: string;
    description: string;
    topics?: string;
    keyConcepts?: string;
    objectives?: string[];
  };
  aiSettings: {
    difficulty: "Easy" | "Medium" | "Hard";
    length: "Short" | "Medium" | "Long";
    questionTypes: Array<"mc" | "tf" | "fill" | "match" | "short" | "order" | "flash" | "scenario">;
    teacherInstructions?: string;
  };
  context?: {
    notes?: string;
    transcript?: string;
    documentSummary?: string;
  };
};

const EXPECTED_COUNTS = {
  Short: { total: 5, mc: 3, tf: 1, fill: 1, match: 0, short: 0, order: 0, flash: 0, scenario: 0 },
  Medium: { total: 10, mc: 4, tf: 2, fill: 2, match: 1, short: 1, order: 0, flash: 0, scenario: 0 },
  Long: { total: 20, mc: 7, tf: 3, fill: 3, match: 2, short: 2, order: 1, flash: 1, scenario: 1 },
} as const;

export function buildPrompt(input: AIGenerateInput): { system: string; user: string } {
  const { lessonInfo, aiSettings, context } = input;
  const lengthPlan = EXPECTED_COUNTS[aiSettings.length];

  const selectedCounts = { ...EXPECTED_COUNTS[aiSettings.length] } as Record<string, number>;
  // zero-out types not requested
  const ALL_TYPES = ["mc", "tf", "fill", "match", "short", "order", "flash", "scenario"] as const;
  for (const t of ALL_TYPES) {
    if (!aiSettings.questionTypes.includes(t as typeof aiSettings.questionTypes[number])) {
      selectedCounts[t] = 0;
    }
  }
  // Rebalance if sum is 0
  let sum = 0;
  for (const t of ALL_TYPES) sum += selectedCounts[t];
  if (sum === 0) {
    selectedCounts.mc = Math.max(3, Math.floor(lengthPlan.total * 0.6));
    selectedCounts.tf = Math.max(1, Math.floor(lengthPlan.total * 0.2));
    selectedCounts.fill = Math.max(1, lengthPlan.total - selectedCounts.mc - selectedCounts.tf);
  }

  const countLines = ALL_TYPES.map(
    (t) =>
      `- ${t.toUpperCase()}: ${selectedCounts[t]} câu`
  ).join("\n");

  const system = `Bạn là một chuyên gia thiết kế bài tập giáo dục, người có kinh nghiệm viết câu hỏi tương tác dựa trên nội dung bài giảng.

Yêu cầu:
1. Chỉ sử dụng các thông tin do giáo viên cung cấp bên dưới. KHÔNG thêm kiến thức ngoài phạm vi mô tả bài giảng.
2. Nếu thông tin bài học quá mơ hồ hoặc thiếu để tạo câu hỏi đáng tin cậy, thay vì bịa ra nội dung không đúng, bạn trả về một phản hồi đặc biệt: {"insufficient": true, "questions": [], "clarificationQuestions": ["Câu hỏi làm rõ 1", ...], "assumptions": ["Các giả định bạn đang áp dụng", ...]}
3. Mỗi câu hỏi phải có đáp án đúng và giải thích rõ ràng bằng tiếng Việt.
4. Độ khó điều chỉnh theo cấp lớp giáo viên nêu. Ví dụ: Lớp 5 đơn giản, Lớp 10 chi tiết hơn.
5. Trả về CHIỀU JSON object thỏa schema sau (trả raw JSON, không có markdown code block, không có markdown code fence prefix):

{
  "title": "Tiêu đề bài tập hấp dẫn theo nội dung",
  "instructions": "Hướng dẫn làm bài ngắn gọn",
  "estimatedMinutes": số phút ước tính làm bài,
  "totalPoints": tổng điểm,
  "questions": [
    // Multiple Choice
    {"id":"q...","type":"mc","question":"Câu hỏi","options":[{"id":"a","text":"Đáp án A"},{"id":"b","text":"Đáp án B"},{"id":"c","text":"Đáp án C"},{"id":"d","text":"Đáp án D"}],"correctOptionId":"b","explanation":"Giải thích tại sao đúng","points":1},
    // True False
    {"id":"q...","type":"tf","question":"Mệnh đề","correctAnswer":true,"explanation":"Giải thích","points":1},
    // Fill in blanks. Đặt {{blank_id}} vào câu hỏi ở vị trí chỗ trống, blanks tương ứng id và danh sách đáp án chấp nhận được (lệnh không dấu, viết hoa thường linh hoạt)
    {"id":"q...","type":"fill","question":"Phương trình: 6{{b1}} + 6H2O -> C6H12O6 + 6{{b2}}","blanks":[{"id":"b1","acceptedAnswers":["CO2","co2","Cacbon dioxit"]},{"id":"b2","acceptedAnswers":["O2","o2","Oxi"]}],"explanation":"Giải thích","points":2},
    // Matching. pairs là các cặp đúng. Frontend sẽ xáo trộn cột right cho học sinh nối.
    {"id":"q...","type":"match","question":"Nối thuật ngữ với định nghĩa","pairs":[{"left":"A","right":"Định nghĩa A"},{"left":"B","right":"Định nghĩa B"}],"explanation":"Giải thích","points":3},
    // Short Answer. rubric là thang điểm để giáo viên/AI chấm điểm.
    {"id":"q...","type":"short","question":"Câu hỏi","rubric":"Thang chấm điểm: 3đ đủ ý...","points":3},
    // Ordering. correctOrder là thứ tự đúng. Frontend sẽ xáo trộn cho học sinh sắp xếp.
    {"id":"q...","type":"order","question":"Sắp xếp các bước...","correctOrder":[{"id":"s1","text":"Bước 1"},{"id":"s2","text":"Bước 2"}],"explanation":"Giải thích","points":2},
    // Flashcard
    {"id":"q...","type":"flash","front":"Mặt trước","back":"Mặt sau"},
    // Scenario
    {"id":"q...","type":"scenario","scenario":"Tình huống thực tế","subQuestions":[{"id":"sq1","type":"mc","question":"Câu hỏi 1","options":[...],"correctOptionId":"a","explanation":"...","points":1}],"points":4}
  ]
}

- Mỗi id câu hỏi dùng tiền tố q + ngẫu nhiên 6 ký tự chữ số.
- Tổng điểm bằng đúng tổng points của tất cả câu hỏi (không tính flashcard).
- Mọi giải thích phải rõ ràng, giúp học sinh hiểu tại sao đáp án đúng.
`;

  const user = `THÔNG TIN BÀI HỌC
- Tiêu đề: ${lessonInfo.title}
- Môn: ${lessonInfo.subject || "(không nêu)"}
- Cấp độ/Lớp: ${lessonInfo.level || "(không nêu)"}
- Ngày học: ${lessonInfo.date || "(không nêu)"}

MÔ TẢ BÀI HỌC (NGUỒN CHÍNH):
"""
${lessonInfo.description || "(trống)"}
"""

CHỦ ĐỀ ĐÃ DẠY:
"""
${lessonInfo.topics || "(không nêu)"}
"""

KHÁI NIỆM CHÍNH CẦN NẮM BẮT:
"""
${lessonInfo.keyConcepts || "(không nêu)"}
"""

MỤC TIÊU HỌC TẬP:
${
  lessonInfo.objectives && lessonInfo.objectives.length
    ? lessonInfo.objectives.map((o, i) => `${i + 1}. ${o}`).join("\n")
    : "(không nêu)"
}

NGỮ CẢNH BỔ SUNG:
${context?.notes ? `- Ghi chú bài học: ${context.notes}` : ""}
${context?.transcript ? `- Transcript Zoom (tóm tắt): ${context.transcript.slice(0, 4000)}` : ""}
${context?.documentSummary ? `- Tóm tắt tài liệu: ${context.documentSummary.slice(0, 3000)}` : ""}

CẤU HÌNH BÀI TẬP:
- Độ khó: ${aiSettings.difficulty}
- Số lượng câu hỏi ước tính (theo loại):
${countLines}
- Hướng dẫn riêng của giáo viên:
"""
${aiSettings.teacherInstructions || "(không có)"}
"""

Hãy tạo bài tập theo đúng schema và nội dung được cung cấp.
`;

  return { system, user };
}
