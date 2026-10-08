/** UI text for the demo site, in the article's language. */
export const strings = {
  en: {
    by: 'By:',
    latest: 'Latest news',
    comments: 'Comments',
    beFirst: 'No comments yet. Start the conversation.',
    off: 'Comments are turned off for this article.',
    placeholder: 'Share your thoughts on this article…',
    replyPlaceholder: 'Write a reply…',
    post: 'Post comment',
    postReply: 'Post reply',
    posting: 'Posting…',
    reply: 'Reply',
    cancel: 'Cancel',
    removed: 'This comment was removed by a moderator.',
    signInPrompt: 'Sign in to join the conversation.',
    signedInAs: 'Commenting as',
    signOut: 'Sign out',
    guidelines: 'Be respectful. Comments that break our guidelines are removed.',
  },
  ar: {
    by: 'بقلم:',
    latest: 'آخر الأخبار',
    comments: 'التعليقات',
    beFirst: 'لا توجد تعليقات بعد. ابدأ النقاش.',
    off: 'التعليقات مغلقة لهذا المقال.',
    placeholder: 'شاركنا رأيك في هذا المقال…',
    replyPlaceholder: 'اكتب ردًا…',
    post: 'نشر التعليق',
    postReply: 'نشر الرد',
    posting: 'جارٍ النشر…',
    reply: 'رد',
    cancel: 'إلغاء',
    removed: 'أزال المشرف هذا التعليق.',
    signInPrompt: 'سجّل الدخول للمشاركة في النقاش.',
    signedInAs: 'تعلّق باسم',
    signOut: 'تسجيل الخروج',
    guidelines: 'يرجى الالتزام بالاحترام. تُزال التعليقات المخالفة لإرشاداتنا.',
  },
} as const

export type Lang = keyof typeof strings
export type Strings = (typeof strings)[Lang]
export const langOf = (value: string | null | undefined): Lang => (value === 'ar' ? 'ar' : 'en')
