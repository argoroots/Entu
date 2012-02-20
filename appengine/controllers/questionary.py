import datetime

from bo import *
from database.feedback import *
from datetime import datetime


class ShowQuestionariesList(boRequestHandler):
    def get(self):
        if not self.authorize('questionary'):
            return

        self.view(
            main_template='main/index.html',
            template_file = 'main/list.html',
            page_title = 'page_feedback',
            values = {
                'list_url': '/questionary',
                'content_url': '/questionary/show',
            }
        )

    def post(self):
        if not self.authorize('questionary'):
            return

        key = self.request.get('key').strip()
        if key:
            questionary = Questionary().get(key)
            self.echo_json({
                'id': questionary.key().id(),
                'key': str(questionary.key()),
                'image': None,
                'title': questionary.displayname,
                'info': questionary.displaydate,
            })
            return

        keys = None
        search = self.request.get('search').strip().lower()
        if search:
            keys = [str(k) for k in list(db.Query(Questionary, keys_only=True).order('-start_date'))]

        if  not keys:
            keys = [str(k) for k in list(db.Query(Questionary, keys_only=True).order('-start_date'))]
        self.echo_json({'keys': keys})


class ShowQuestionary(boRequestHandler):
    def get(self, questionary_id):
        if not self.authorize('questionary'):
            return

        questionary = Questionary().get_by_id(int(questionary_id))

        self.view(
            template_file = 'questionary/questionary_info.html',
            values = {
                'questionary': questionary,
            }
        )










    def post(self, key):
        if self.authorize('questionary'):
            name = self.request.get('name').strip()
            start_date = self.request.get('start_date').strip()
            end_date = self.request.get('end_date').strip()
            description = self.request.get('description').strip()

            if key:
                q = db.get(key)
            else:
                q = Questionary()
            q.name = DictionaryAdd('questionary_name', name)
            if start_date:
                q.start_date = datetime.strptime(start_date, '%d.%m.%Y').date()
            if end_date:
                q.end_date = datetime.strptime(end_date, '%d.%m.%Y').date()
            q.description = DictionaryAdd('questionary_description', description)
            q.put()

            if not key:
                self.response.out.write(str(q.key()))


class ShowQuestionaryResults(boRequestHandler):
    def get(self, key):
        message = ''
        message += '"Aine",'
        message += '"Oppejoud",'
        message += '"Kysimus",'
        message += '"Vastus"'
        message += '\n'

        for qa in db.Query(QuestionAnswer).fetch(20):
            mrow = ''
            mrow += '"' + qa.questionary_person.bubble.displayname.replace('"','""') + '",'

            if qa.target_person:
                tp = qa.target_person
                mrow += '"' + tp.forename + " " + tp.surname + '",'
            else:
                mrow += ','

            mrow += '"' + qa.question.name.value.replace('"','""') + '",'

            if qa.answer:
                mrow += qa.answer
            else:
                mrow += '0'

            #self.echo(mrow)
            message += mrow + '\n'

        SendMail(
            to = 'mihkel.putrinsh@artun.ee',
            subject = 'Feedback',
            message = '...',
            attachments = [('feedback_rating.csv', message)]
        )


class ShowQuestionaryResultsTask(boRequestHandler):
    def get(self, key):
        taskqueue.Task(url='/questionary/results').add()


class ShowQuestionaryResults2(boRequestHandler):
    def get(self, key):
        message = ''
        message += '"Aine",'
        message += '"Vastus",'
        message += '\n'

        for a in db.Query(QuestionAnswer).filter('question', db.Key('agdib25nYXBwchALEghRdWVzdGlvbhi74kkM')).fetch(100000):

            if a.answer:
                message += '"' + a.course.subject.name.value.replace('"','""') + '",'
                message += '"' + a.answer.strip().replace('"','""') + '",'
                message += '\n'

        #self.echo(message)

        SendMail(
            to = 'mihkel.putrinsh@artun.ee',
            subject = 'Feedback',
            message = '...',
            attachments = [('feedback_text.csv', message)]
        )


class SortQuestionary(boRequestHandler):
    def post(self, key):
        if self.authorize('questionary'):
            questions = self.request.get_all('question')

            ordinal = 0
            for question in questions:
                ordinal = ordinal + 1
                q = db.Query(Question).filter('__key__', db.Key(question)).get()
                q.ordinal = ordinal
                q.put()


class DeleteQuestionary(boRequestHandler):
    def get(self, key):
        if self.authorize('questionary'):
            for q in db.Query(Question).filter('questionary', db.Key(key)).fetch(1000):
                q.delete()

            q = db.Query(Questionary).filter('__key__', db.Key(key)).get()
            q.delete()
            self.redirect('/questionary')


class EditQuestion(boRequestHandler):
    def post(self):
        if self.authorize('questionary'):
            questionary_key = self.request.get('questionary').strip()
            name = self.request.get('name').strip()
            type = self.request.get('type').strip()
            mandatory = self.request.get('mandatory').strip()
            teacher_specific = self.request.get('teacher_specific').strip()

            q = Question()
            q.questionary = db.Key(questionary_key)
            q.name = DictionaryAdd('question_name', name)
            q.type = type
            if mandatory:
                q.is_mandatory = True
            if teacher_specific:
                q.is_teacher_specific = True
            q.put()

            self.redirect('/questionary/' + questionary_key)


class DeleteQuestion(boRequestHandler):
    def get(self, key):
        if self.authorize('questionary'):
            q = db.Query(Question).filter('__key__', db.Key(key)).get()
            q.delete()


class GenerateQuestionaryPersons(boRequestHandler):
    def get(self):
        taskqueue.Task(url='/questionary/generate').add()
        self.redirect('/questionary')


    def post(self):
        limit = 200
        step = int(self.request.get('step', 1))
        offset = int(self.request.get('offset', 0))

        questionary = Questionary().get('agpzfmJ1YmJsZWR1chQLEgtRdWVzdGlvbmFyeRixmvwBDA')

        rc = 0
        bc = 0
        qpc = 0
        qac = 0
        for g in db.Query(Grade).filter('typed_tags', 'semester:2011S').order('__key__').fetch(limit=limit, offset=offset):
            rc += 1
            if g.bubble:
                bc += 1
                sc = db.Query(Person).filter('seeder', g.bubble.key()).count()

                qp = db.Query(QuestionaryPerson).filter('questionary', questionary).filter('person', g.person).filter('bubble', g.bubble).get()
                if not qp:
                    qpc += 1

                    qp = QuestionaryPerson()
                    qp.questionary = questionary
                    qp.person = g.person
                    qp.bubble = g.bubble
                    qp.put()

                    for question in questionary.questions:
                        qac += 1
                        if question.is_teacher_specific:
                            for teacher in db.Query(Person).filter('seeder', g.bubble.key()):
                                qa = QuestionAnswer()
                                qa.questionary_person = qp
                                qa.person = g.person
                                qa.target_person = teacher
                                qa.questionary = questionary
                                qp.bubble = g.bubble
                                qa.question = question
                                qa.put()
                        else:
                            qa = QuestionAnswer()
                            qa.questionary_person = qp
                            qa.person = g.person
                            qa.questionary = questionary
                            qp.bubble = g.bubble
                            qa.question = question
                            qa.put()

        logging.debug('#' + str(step) + ' - g:' + str(rc) + ' b:' + str(bc) + ' qp:' + str(qpc) + ' qa:' + str(qac))

        if rc == limit:
            taskqueue.Task(url='/questionary/generate', params={'offset': (offset + rc), 'step': (step + 1)}).add()

        self.echo('done')


def main():
    Route([
            ('/questionary', ShowQuestionariesList),
            (r'/questionary/show/(.*)', ShowQuestionary),
            ('/questionary/sort/(.*)', SortQuestionary),
            ('/questionary/delete/(.*)', DeleteQuestionary),
            ('/questionary/results/(.*)', ShowQuestionaryResults),
            ('/questionary/results_task/(.*)', ShowQuestionaryResultsTask),
            ('/questionary/results2/(.*)', ShowQuestionaryResults2),
            ('/questionary/question/delete/(.*)', DeleteQuestion),
            ('/questionary/generate', GenerateQuestionaryPersons),
            ('/questionary/question', EditQuestion),
        ])


if __name__ == '__main__':
    main()
