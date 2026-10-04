with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix the weird character in Budget Range label
code = code.replace('(Per Month Gé¦)', '(Per Month ?)')
# If it's already ?, replace just to be sure. It might be corrupted.
# Let's just replace the whole span text.
code = code.replace('<span>Budget Range <span className="text-green-600">(Per Month ', '<span>Budget Range <span className="text-green-600">(Per Month ?')
# Actually, let's just do a safer replace using regex.
import re
code = re.sub(r'\(Per Month [^\)]*\)', '(Per Month ?)', code)

# Fix the hardcoded "LPA" inside the inputs to be dynamic!
# We will create a variable for the budget suffix at the top of the component or just inline it.
inline_suffix = '{["Contract", "C2H", "Freelance"].includes(watch("jobType")) ? "/mo" : "LPA"}'

code = code.replace(
    '<span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500">LPA</span>',
    f'<span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500">{inline_suffix}</span>'
)

# And fix the tooltip for the budget range
code = code.replace('title="Target Budget CTC Range in Lakhs Per Annum (Min - Max)"', 'title={["Contract", "C2H", "Freelance"].includes(watch("jobType")) ? "Target Budget in Per Month (Min - Max)" : "Target Budget CTC Range in Lakhs Per Annum (Min - Max)"}')


with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Fixed Budget UI')
