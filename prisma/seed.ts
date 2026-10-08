import { PrismaClient, UserRole, ClassStatus, AssignmentStatus, SubmissionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function generateJoinCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function main() {
  console.log("🌱 Seeding database...");

  const passwordHash = await bcrypt.hash("Demo123456", 10);

  const teacher = await prisma.user.upsert({
    where: { email: "teacher@demo.com" },
    update: {},
    create: {
      name: "Cô Nguyễn Thị Mai",
      email: "teacher@demo.com",
      passwordHash,
      role: UserRole.TEACHER,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "student@demo.com" },
    update: {},
    create: {
      name: "Nguyễn Văn An",
      email: "student@demo.com",
      passwordHash,
      role: UserRole.STUDENT,
    },
  });

  // Create additional 4 demo students
  const studentNames = [
    { name: "Trần Thị Bình", email: "binh@demo.com" },
    { name: "Lê Minh Cường", email: "cuong@demo.com" },
    { name: "Phạm Hoàng Dung", email: "dung@demo.com" },
    { name: "Ngô Thị Em", email: "em@demo.com" },
  ];
  const additionalStudents = [];
  for (const s of studentNames) {
    const stu = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: { ...s, passwordHash, role: UserRole.STUDENT },
    });
    additionalStudents.push(stu);
  }

  // Create Biology 10 class
  let biologyClass = await prisma.class.findFirst({
    where: { teacherId: teacher.id, name: "Sinh học 10" },
  });
  if (!biologyClass) {
    biologyClass = await prisma.class.create({
      data: {
        teacherId: teacher.id,
        name: "Sinh học 10",
        subject: "Sinh học",
        level: "Lớp 10",
        description:
          "Môn Sinh học lớp 10 bao gồm các chủ đề: tế bào, chuyển hóa vật chất và năng lượng, sinh học vi sinh vật, di truyền, tiến hóa, sinh thái.",
        joinCode: generateJoinCode(),
        status: ClassStatus.ACTIVE,
      },
    });
  }

  // Enroll all students into the class
  const allStudents = [student, ...additionalStudents];
  for (const stu of allStudents) {
    await prisma.classEnrollment.upsert({
      where: {
        classId_studentId: {
          classId: biologyClass.id,
          studentId: stu.id,
        },
      },
      update: {},
      create: {
        classId: biologyClass.id,
        studentId: stu.id,
      },
    });
  }

  // Create a sample lesson: Photosynthesis
  let photosynthesisLesson = await prisma.lesson.findFirst({
    where: { classId: biologyClass.id, title: "Quang hợp thực vật" },
  });
  if (!photosynthesisLesson) {
    photosynthesisLesson = await prisma.lesson.create({
      data: {
        classId: biologyClass.id,
        teacherId: teacher.id,
        title: "Quang hợp thực vật",
        description:
          "Học về quá trình quang hợp ở thực vật, vai trò của diệp lục, ánh sáng mặt trời, khí CO2 và nước để tạo ra glucose và O2.",
        lessonDate: new Date(),
        lessonNotes:
          "Bài học tập trung vào: (1) Thành phần hóa học của tế bào (2) Quang hợp: giai đoạn sáng và tối (3) So sánh quang hợp và hô hấp tế bào.",
        learningObjectives: [
          "Học sinh nêu được nguyên liệu và sản phẩm của quá trình quang hợp",
          "Học sinh giải thích được vai trò của diệp lục và ánh sáng mặt trời",
          "Học sinh phân biệt được quang hợp và hô hấp tế bào",
        ],
        topicsCovered: "Diệp lục, ánh sáng, CO2, nước, glucose, oxy, giai đoạn sáng, giai đoạn tối",
      },
    });
  }

  // Create a sample assignment for photosynthesis
  const sampleAssignment = await prisma.assignment.upsert({
    where: {
      id: "sample-assignment-photosynthesis",
    },
    update: {},
    create: {
      id: "sample-assignment-photosynthesis",
      classId: biologyClass.id,
      lessonId: photosynthesisLesson.id,
      teacherId: teacher.id,
      title: "Bài tập: Quang hợp thực vật",
      instructions:
        "Đọc kỹ từng câu hỏi và chọn đáp án đúng. Với câu tự luận, hãy trình bày ý rõ ràng, súc tích.",
      difficulty: "Medium",
      estimatedMinutes: 20,
      totalPoints: 10,
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      status: AssignmentStatus.PUBLISHED,
      showFeedbackImmediately: true,
      questionsJson: [
        {
          id: "q1",
          type: "mc",
          question: "Sản phẩm chính của quang hợp là gì?",
          options: [
            { id: "a", text: "Nước và khí oxy" },
            { id: "b", text: "Glucose và khí oxy" },
            { id: "c", text: "Carbon dioxide và nước" },
            { id: "d", text: "Glucose và khí carbon dioxide" },
          ],
          correctOptionId: "b",
          explanation:
            "Quang hợp sử dụng CO2, H2O và năng lượng ánh sáng để tạo ra glucose (C6H12O6) và giải phóng O2.",
          points: 1,
        },
        {
          id: "q2",
          type: "tf",
          question: "Diệp lục có trong lục lạp, có nhiệm vụ hấp thụ năng lượng ánh sáng mặt trời.",
          correctAnswer: true,
          explanation:
            "Diệp lục là sắc tố màu xanh lá cây nằm trong lục lạp, hấp thụ chủ yếu ánh sáng đỏ và xanh tím.",
          points: 1,
        },
        {
          id: "q3",
          type: "fill",
          question:
            "Phương trình tổng quát quang hợp: 6____ + 6H2O --(ánh sáng, diệp lục)--> C6H12O6 + 6____",
          blanks: [
            { id: "b1", acceptedAnswers: ["CO2", "co2", "CO 2", "Carbon Dioxide", "Cacbon điôxít"] },
            { id: "b2", acceptedAnswers: ["O2", "o2", "O 2", "Oxy", "Oxygen"] },
          ],
          explanation:
            "6CO2 + 6H2O → C6H12O6 + 6O2. Nguyên liệu là CO2 và H2O; sản phẩm là glucose và O2.",
          points: 2,
        },
        {
          id: "q4",
          type: "match",
          question: "Nối giai đoạn quang hợp với đặc điểm tương ứng:",
          pairs: [
            { left: "Giai đoạn sáng", right: "Xảy ra ở tilakoid, cần ánh sáng, phân giải nước, tạo ATP và NADPH" },
            { left: "Giai đoạn tối", right: "Xảy ra ở chất nền (stroma), cố định CO2, tạo glucose" },
            { left: "Hô hấp tế bào", right: "Phân giải glucose giải phóng năng lượng (ATP), CO2 và H2O" },
          ],
          explanation:
            "Giai đoạn sáng cần ánh sáng để quang phân giải nước. Giai đoạn tối (Chu trình Calvin) cố định CO2 tạo đường.",
          points: 3,
        },
        {
          id: "q5",
          type: "short",
          question: "So sánh quang hợp và hô hấp tế bào (nêu ít nhất 3 điểm khác biệt).",
          rubric:
            "3 điểm: đúng 3 khác biệt cơ bản (nguyên liệu, sản phẩm, diễn ra ở cơ quan nào). 2 điểm: đủ 2 khác biệt. 1 điểm: 1 khác biệt.",
          points: 3,
        },
      ],
      answerKeyJson: {
        q1: "b",
        q2: true,
        q3: { b1: "CO2", b2: "O2" },
        q4: [
          ["Giai đoạn sáng", "Xảy ra ở tilakoid, cần ánh sáng, phân giải nước, tạo ATP và NADPH"],
          ["Giai đoạn tối", "Xảy ra ở chất nền (stroma), cố định CO2, tạo glucose"],
          ["Hô hấp tế bào", "Phân giải glucose giải phóng năng lượng (ATP), CO2 và H2O"],
        ],
        q5: {
          reference: [
            "Nguyên liệu: QH: CO2 + H2O; HH: C6H12O6 + O2",
            "Sản phẩm: QH: C6H12O6 + O2; HH: CO2 + H2O + ATP",
            "Nơi diễn ra: QH ở lục lạp; HH ở tế bào chất và ti thể",
            "Năng lượng: QH tích lũy (dưới dạng đường); HH giải phóng ATP",
          ],
        },
      },
    },
  });

  // Create one submission from Nguyễn Văn An (graded: 8.5)
  await prisma.submission.upsert({
    where: {
      assignmentId_studentId: {
        assignmentId: sampleAssignment.id,
        studentId: student.id,
      },
    },
    update: {},
    create: {
      assignmentId: sampleAssignment.id,
      studentId: student.id,
      answersJson: {
        q1: "b",
        q2: true,
        q3: { b1: "CO2", b2: "O2" },
        q4: [
          ["Giai đoạn sáng", "Xảy ra ở tilakoid, cần ánh sáng, phân giải nước, tạo ATP và NADPH"],
          ["Giai đoạn tối", "Xảy ra ở chất nền (stroma), cố định CO2, tạo glucose"],
          ["Hô hấp tế bào", "Phân giải glucose giải phóng năng lượng (ATP), CO2 và H2O"],
        ],
        q5: "Khác biệt: 1. Nguyên liệu quang hợp là CO2 và H2O; hô hấp là glucose và O2. 2. Sản phẩm quang hợp là glucose và O2; hô hấp là CO2, H2O và năng lượng ATP. 3. Quang hợp diễn ra ở lục lạp của tế bào thực vật, hô hấp diễn ra ở tế bào chất và ti thể của mọi tế bào.",
      },
      autoGradeScore: 7,
      aiSuggestedScore: 8.5,
      score: 8.5,
      maxScore: 10,
      feedback:
        "Làm tốt! Trả lời đầy đủ 3 điểm khác biệt. Một ý nhỏ: nhớ phân biệt rõ năng lượng nào được tích lũy, năng lượng nào được giải phóng.",
      status: SubmissionStatus.GRADED,
      submittedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      gradedAt: new Date(Date.now() - 24 * 3600 * 1000),
      gradedBy: teacher.id,
    },
  });

  // A couple of announcements
  await prisma.announcement.upsert({
    where: { id: "ann-1" },
    update: {},
    create: {
      id: "ann-1",
      classId: biologyClass.id,
      teacherId: teacher.id,
      title: "Lịch học tuần 15",
      content:
        "Tuần sau: tiết 2-3 thứ 3 học chủ đề Hô hấp tế bào. Đọc trước SGK trang 80-85. Mang theo vở bài tập để làm bài 1, 2.",
    },
  });

  await prisma.announcement.upsert({
    where: { id: "ann-2" },
    update: {},
    create: {
      id: "ann-2",
      classId: biologyClass.id,
      teacherId: teacher.id,
      title: "Thông báo về bài tập Quang hợp",
      content:
        "Bài tập Quang hợp mở từ 20/09, hạn nộp 27/09 23:59. Sau hạn chót, bài nộp trễ sẽ bị trừ 20% điểm.",
    },
  });

  console.log(`✅ Seeding complete!`);
  console.log(`   Teacher: ${teacher.name} (${teacher.email}) / Demo123456`);
  console.log(`   Student: ${student.name} (${student.email}) / Demo123456`);
  console.log(`   Class "${biologyClass.name}" join code: ${biologyClass.joinCode}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
