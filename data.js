/* All story content is local so the game also works offline. */
window.ECHO_DATA = {
  contacts: {
    rina: { name: "Rina", number: "19830382907" },
    emma: { name: "Emma", number: "10389382039" },
    collins: { name: "Ms. Collins", number: "19382749938" },
    lauren: { name: "Lauren", number: "18739729847" }
  },
  opening: "Echo really is leaving this time. Are you still in touch with that person? If you can, come and see it together one last time.",
  inbox: [
    { id: "new", title: "Rina · New message", date: "October 2026", bubbles: [
      ["Rina", "Echo really is leaving this time. Are you still in touch with that person? If you can, come and see it together one last time."]
    ]},
    { id: "ringtone", title: "Lauren · Ringtone", date: "Early 2006", bubbles: [
      ["Perla", "I finally learned to set a ringtone. Go to Calls > Settings > Ringtone. I chose my favorite song."]
    ]},
    { id: "emma-talk", title: "Lauren · Emma", date: "Early 2006", bubbles: [
      ["Lauren", "Emma hasn't eaten with us again. Something feels off."],
      ["Perla", "Maybe she's just busy."],
      ["Lauren", "I just wish people would tell me when something is wrong instead of pretending everything is fine."],
      ["Perla", "Maybe some things are hard to say."]
    ]},
    { id: "typing", title: "Rina · Typing", date: "Early 2006", bubbles: [
      ["Perla", "I'm still getting used to this phone. Typing is slow."],
      ["Rina", "Especially on these keys."],
      ["Perla", "For names we all know, I use the number for each letter, once per letter. No repeated taps. Your name is 7462."],
      ["Rina", "R-I-N-A. Got it."]
    ]}
  ],
  archive: [
    { id: "echo-start", title: "Lauren · Echo's beginning", date: "Early 2006", bubbles: [
      ["Lauren", "What if we put a board in the library where anyone can leave a note without signing it?"],
      ["Perla", "Some people might say things there that they can't say aloud."],
      ["Lauren", "And other people could answer. Like an echo."],
      ["Perla", "Echo. Let's make it together."]
    ]},
    { id: "harmful-note", title: "Lauren · The harmful note", date: "October 30, 2006", bubbles: [
      ["Lauren", "Someone left an insulting note on Echo. It hurt people. Anonymous can't mean no responsibility."],
      ["Perla", "I saw it. I'm sorry."],
      ["Lauren", "Could we ask Ms. Collins whether the library cameras show who was there?"],
      ["Perla", "I'll speak to her next week. We should figure out who did this."]
    ]},
    { id: "rina-help", title: "Rina · Offering help", date: "Early 2006", bubbles: [
      ["Rina", "I'm so happy Echo is real. I'd love to help."],
      ["Perla", "Come to the library next Friday. I'll show you what needs doing."]
    ]},
    { id: "collins-support", title: "Ms. Collins · Support", date: "Early 2006", bubbles: [
      ["Ms. Collins", "The school supports the message board. Make sure students can reply safely and tell me if you need help."],
      ["Perla", "Thank you. Lauren and I will take care of it."]
    ]},
    { id: "threat", title: "Unknown · Threat", date: "November 3, 2006", bubbles: [
      ["Unknown", "If you keep looking for me, I'll put your clinic report on Echo."]
    ]},
    { id: "collins-pause", title: "Ms. Collins · Pause", date: "November 10, 2006", bubbles: [
      ["Ms. Collins", "I've heard about a hurtful post. How do you two plan to handle it?"],
      ["Perla", "We may never know who wrote it. Please pause Echo before more harmful messages spread."],
      ["Ms. Collins", "I'm sorry it has come to this. I can bring this to the school. If you need help, call me at 19382749938."]
    ]},
    { id: "lauren-last", title: "Lauren · Last message", date: "November 13, 2006", bubbles: [
      ["Lauren", "I saw the notice. I thought this was something we were doing together. I thought you trusted me. I guess I was wrong."]
    ]},
    { id: "rina-later", title: "Rina · Checking in", date: "November 15, 2006", bubbles: [
      ["Rina", "Are you okay? Echo has stopped for now, but I believe it can return. We need a place like that."]
    ]}
  ],
  apology: "Lauren, I'm sorry I made the decision without you and then disappeared. Someone threatened to share something private about me. I was afraid you would see me differently, so I shut Echo down instead of telling you. I should have trusted you enough to let you decide for yourself. I miss you. —Perla",
  reply: "The past is the past. People can have a new beginning. This is my new number: 18739729847. If you want to talk, call me.",
  voicemails: [
    { id: "seller", title: "Phone seller", date: "2005", text: "One thing I forgot to mention: the Memos app starts with PIN 0000. You can change it to any four-digit PIN. Be careful: three wrong tries erase the memos. Pick a date you'll remember, such as a birthday." },
    { id: "young-woman", title: "Unknown young woman", date: "2006", text: "Perla, Echo is in trouble. Meet me at the school library as soon as you can." }
  ],
  memos: [
    { id: "birthday", title: "Birthday", date: "December 31, 2005", text: "Mom gave me a new phone today. I'll use Memos as a diary. My birthday is always the happiest day of my year. For a moment it feels as if the whole world is celebrating with me." },
    { id: "echo-opens", title: "Echo opens", date: "Early 2006", text: "Echo has only been in the library a few days, and the board is already crowded with notes. I didn't expect so many people to come." },
    { id: "speaking", title: "Speaking", date: "Mid 2006", text: "Face-to-face conversations can feel like a test. I keep trying to meet everyone's expectations. With Echo, I can be honest without that pressure." },
    { id: "record", title: "A record", date: "Mid 2006", text: "I beat my favorite game's record today. My old score is still number one in our year. I want to remember it forever." },
    { id: "happened", title: "What happened", date: "November 2006", text: "Echo became what it is now, and I may be mostly responsible. I should never have listened to that threat." },
    { id: "leaving", title: "Leaving", date: "Late 2006", text: "Echo is gone. Remembering the good days hurts now. Maybe I should lock those memories away under the date I lost it." }
  ],
  photos: [
    { id: "portrait", title: "Graduation portrait", kind: "Portrait", date: "2006", text: "Graduation day, 2006. The handwritten name on the back reads Perla." },
    { id: "certificate", title: "Graduation certificate", kind: "Certificate", date: "2006", text: "Perla — Graduating Class of 2006. Class roster: Perla, Lauren, Rina, Emma, Maya, Sofia, Daniel, Noah, Hannah, Alex, Priya, Ethan, Grace, Leo, Olivia, Sam, Isabel, David, Nina, Owen." },
    { id: "birthday-photo", title: "Birthday in Times Square", kind: "New Year's Eve", date: "December 31, 2005", text: "Perla holds a birthday cake in front of a Times Square countdown. Date stamp: December 31, 2005. Another year begins with my birthday." }
  ],
  album: [
    { id: "friends", title: "Two friends", kind: "Photograph", date: "2006", text: "Perla and another girl stand together at the library. On the back: Perla + Lauren." },
    { id: "contact-page", title: "Class contacts", kind: "Address book", date: "2006", text: "Rina — 19830382907\nEmma — 10389382039" },
    { id: "board", title: "The library board", kind: "ECHO", date: "2006", text: "A physical board in a school-library corner titled ECHO. Students leave unsigned notes and replies.", notes: [
      ["I can be surrounded by people and still feel alone.", "Someone here understands."],
      ["I failed an exam and don't know how to tell my family.", "One result is not your whole future."],
      ["I miss a friend but don't know how to start talking again.", "Maybe start with one honest sentence."]
    ]},
    { id: "clinic", title: "Student support visit", kind: "Confidential", date: "2006", text: "Student support visit — Perla — 2006. Perla reports prolonged fatigue, loneliness, and low mood, especially around social expectations. Assessment: symptoms consistent with mild depression. Follow-up counseling offered. Confidential student record." },
    { id: "notice", title: "School library notice", kind: "Notice", date: "November 13, 2006", text: "School Library Notice — November 13, 2006. Echo, a student-created anonymous exchange board, has been welcomed by many students. Because harmful messages have recently circulated on the board, its use is suspended until further notice. Please speak with Ms. Collins if you need support." }
  ],
  endings: {
    lauren: { title: "The conversation can begin", lines: [
      ["Lauren", "Perla? I got your message. I never needed you to be fine all the time."],
      ["Player", "I'm not Perla. I found her old phone in the library. I sent the draft she never managed to send. Rina says Echo is being removed."],
      ["Lauren", "Then I hope she knows I'm willing to talk. I was hurt because she faced something frightening and thought she had to hide it from me. We could have faced it together."],
      ["Player", "You weren't angry that Echo closed?"],
      ["Lauren", "I was sad about Echo. What broke us was the silence. I became her friend because she was Perla, not because she was always cheerful."]
    ], card: "The board's last day is coming. The conversation can still begin." },
    rina: { title: "The name you needed", lines: [
      ["Rina", "Perla? How have you been? After graduation, you disappeared from all of us. We were worried."],
      ["Player", "I'm a student who found her phone. I saw your message. Who did you mean by 'that person'?"],
      ["Rina", "Lauren. They built Echo together. The library's being renovated, and I hoped they could see the board before it goes. If you can return the phone, please tell Perla."]
    ], card: "You found the name. Their conversation is still waiting." },
    emma: { title: "The author of the threat", lines: [
      ["Emma", "I wrote that note. I sent the threat too. I felt like the third person outside Perla and Lauren's friendship, and I wanted to upset them."],
      ["Player", "How did you know about the clinic report?"],
      ["Emma", "I saw it while volunteering at the clinic. I should never have looked at it, and threatening to share it was cruel. I told myself it was a prank. It wasn't. I'm sorry."]
    ], card: "The author is known. The people she hurt still need the truth." },
    collins: { title: "A new space remains", lines: [
      ["Ms. Collins", "Echo gave students a place to say what they couldn't say face to face. I was proud of what Perla and Lauren made."],
      ["Player", "Rina said it is leaving again."],
      ["Ms. Collins", "The physical board has to come down for the renovation. There is an online Echo now, but that library corner holds its own memories. If you find Perla, tell her she's welcome to see it once more."]
    ], card: "A new space remains. The old board will be gone." }
  },
  evidence: {
    "thread:new": ["The new message", "Rina asks the phone's owner to return to Echo with 'that person'."],
    "thread:ringtone": ["A favorite ringtone", "Perla set her favorite song under Calls > Settings > Ringtone."],
    "thread:emma-talk": ["A difficult sentence", "Lauren wanted friends to say when something was wrong; Perla said some things were hard to say."],
    "thread:typing": ["One digit per letter", "Perla used the number for each letter on the phone keypad, with no repeated taps."],
    "ringtone": ["The selected song", "The selected ringtone is described as 'the sound of silence'."],
    "voicemail:seller": ["Memos warning", "The seller said Memos began at 0000, could be changed to a memorable date, and erase after three wrong tries."],
    "voicemail:young-woman": ["A name spoken aloud", "A young woman called the owner Perla and asked her to come to the library."],
    "photo:portrait": ["A name on a portrait", "A graduation portrait has the name Perla on its back."],
    "photo:certificate": ["Class of 2006", "Perla, Lauren, Rina, and Emma appear on the same class roster."],
    "photo:birthday-photo": ["Perla's birthday", "Her birthday photograph is dated December 31."],
    "memo:record": ["A remembered record", "Perla kept her favorite game's school-year record in mind."],
    "game:runner": ["Historical game score", "Obstacle Run shows a historical school-year best of 39870."],
    "photo:board": ["Echo in the library", "Echo was a physical anonymous message board with notes and replies."],
    "photo:notice": ["The first closure", "A school notice suspended Echo on November 13, 2006."],
    "photo:clinic": ["A private assessment", "Perla sought support for fatigue, loneliness, and low mood. Her record was confidential."],
    "photo:friends": ["Perla and Lauren", "A photograph of the two friends is labeled on its back."],
    "photo:contact-page": ["Class contacts", "Rina and Emma's phone numbers are recorded in the locked album."],
    "thread:echo-start": ["Echo's creators", "Perla and Lauren planned Echo together."],
    "thread:threat": ["The threat", "An unknown texter threatened to reveal Perla's private clinic report."],
    "thread:collins-pause": ["Perla's request", "Perla asked Ms. Collins to suspend Echo and was given a contact number."],
    "thread:lauren-last": ["Lauren's unanswered text", "Lauren felt shut out after Perla acted alone."],
    "deleted": ["An apology never sent", "Perla drafted an explanation to Lauren and then deleted it."],
    "reply": ["Lauren's new number", "Lauren's automatic reply invites a call to her new number."]
  }
};
