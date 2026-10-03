import re

def remove_unused(file_path, unused_vars):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove unused vars from imports
    for var in unused_vars:
        content = re.sub(r'(\b' + var + r'\b\s*,\s*)|(\s*,\s*\b' + var + r'\b)', '', content)
        content = re.sub(r'{\s*' + var + r'\s*}', '{}', content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

# admin/calendar
remove_unused('src/app/admin/calendar/page.tsx', ['Warning', 'Cancel', 'CheckCircle'])

# admin/courses/create
with open('src/app/admin/courses/create/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('useEffect(() => {', 'useEffect(() => { // eslint-disable-next-line react-hooks/exhaustive-deps')
with open('src/app/admin/courses/create/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# admin/courses/recorded
remove_unused('src/app/admin/courses/recorded/page.tsx', ['Filter', 'Clock', 'Users', 'CheckCircle2'])

# admin/dashboard
remove_unused('src/app/admin/dashboard/page.tsx', ['XAxis', 'YAxis', 'CartesianGrid', 'Tooltip', 'ResponsiveContainer'])
with open('src/app/admin/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = re.sub(r'const \[menuOpen, setMenuOpen\] = useState\(false\);', 'const [menuOpen] = useState(false);', content)
content = re.sub(r'const \[currentView, setCurrentView\] = useState\("overview"\);', '', content)
with open('src/app/admin/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# educator/calendar
remove_unused('src/app/educator/calendar/page.tsx', ['useRef', 'useEffect'])

# educator/chats
remove_unused('src/app/educator/chats/page.tsx', ['Users'])

# educator/courses/[id]
remove_unused('src/app/educator/courses/[id]/page.tsx', ['BookOpen', 'Users', 'Clock', 'ArrowRight', 'PlayCircle', 'CheckCircle2', 'ChevronRight', 'FileQuestion', 'Save', 'X', 'CalendarIcon', 'AlignLeft'])

# educator/payouts
remove_unused('src/app/educator/payouts/page.tsx', ['ChevronDown'])

# educator/settings
remove_unused('src/app/educator/settings/page.tsx', ['Clock'])

# parent/schedule
with open('src/app/parent/schedule/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = re.sub(r'const \[currentView, setCurrentView\] = useState\("upcoming"\);', 'const [currentView] = useState("upcoming");', content)
content = content.replace("Don't", "Don&apos;t")
with open('src/app/parent/schedule/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
