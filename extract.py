import docx
doc = docx.Document(r'd:\work\lms-dev\trd and prd\LMS_Combined_PRD_v1.0.docx')
with open('prd_text.txt', 'w', encoding='utf-8') as f:
    for p in doc.paragraphs:
        f.write(p.text + '\n')
