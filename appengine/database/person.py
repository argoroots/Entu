from google.appengine.ext import db
from google.appengine.ext import search
from google.appengine.ext import blobstore
from google.appengine.api import images
from google.appengine.api import users
from google.appengine.api import taskqueue
from datetime import date
from datetime import datetime

from bo import *
from database.dictionary import *
from database.general import *
from libraries.gmemsess import *


class Role(ChangeLogModel):
    name            = db.ReferenceProperty(Dictionary, collection_name='role_names')
    rights          = db.StringListProperty()
    template_name   = db.StringProperty()
    model_version   = db.StringProperty(default='A')

    @property
    def displayname(self):
        if self.name:
            return self.name.value
        else:
            return ''


class Person(ChangeLogModel):
    created                 = db.DateTimeProperty(auto_now_add=True)
    is_deleted              = db.BooleanProperty(default=False)
    is_guest                = db.BooleanProperty(default=False)
    user                    = db.StringListProperty()
    email                   = db.StringProperty()
    password                = db.StringProperty()
    forename                = db.StringProperty()
    surname                 = db.StringProperty()
    idcode                  = db.StringProperty()
    citizenship             = db.StringProperty()
    country_of_residence    = db.StringProperty()
    gender                  = db.StringProperty(choices=['', 'male', 'female'])
    birth_date              = db.DateProperty()
    have_been_subsidised    = db.BooleanProperty(default=False)
    roles                   = db.ListProperty(db.Key)
    current_role            = db.ReferenceProperty(Role, collection_name='persons')
    last_seen               = db.DateTimeProperty()
    model_version           = db.StringProperty(default='A')
    seeder                  = db.ListProperty(db.Key)
    leecher                 = db.ListProperty(db.Key)
    sort                    = db.StringProperty(default='')
    search                  = db.StringListProperty()
    merged_from             = db.ListProperty(db.Key)

    def AutoFix(self):
        if not hasattr(self, 'idcode'):
            self.idcode = ''

        if not self.idcode:
            self.idcode = ''

        if self.idcode.strip() == 'guest':
            self.idcode = ''
            self.is_guest = True
        else:
            if not self.idcode.strip():
                self.idcode = ''
            self.is_guest = False

        if self.forename:
            self.forename = self.forename.title().strip().replace('  ', ' ').replace('- ', '-').replace(' -', '-')

        if self.surname:
            self.surname = self.surname.title().strip().replace('  ', ' ').replace('- ', '-').replace(' -', '-')

        self.sort = StringToSortable(self.displayname)
        self.search = StringToSearchIndex(self.displayname)

        self.put('autofix')

        # for l in self.leecher:
        #     taskqueue.Task(url='/taskqueue/bubble_change_leecher', params={'action': 'add', 'bubble_key': str(l), 'person_key': str(self.key())}).add(queue_name='bubble-one-by-one')

        # for l in self.seeder:
        #     taskqueue.Task(url='/taskqueue/bubble_change_seeder', params={'action': 'add', 'bubble_key': str(l), 'person_key': str(self.key())}).add(queue_name='bubble-one-by-one')


    @property
    def displayname(self):
        name = ''
        if self.forename or self.surname:
            if self.forename:
                name = name + self.forename
            if self.surname:
                name = name + ' ' + self.surname
        else:
            if self.primary_email:
                name = self.primary_email.split('@')[0]
        return name

    @property
    def primary_email(self):
        if self.user:
            return self.user[0]
        emails = self.emails
        if len(emails) > 0:
            return emails[0]

    @property
    def emails(self):
        emails = []
        if self.user:
            emails = AddToList(self.user[0], emails)
        if self.email:
            emails = AddToList(self.email, emails)
        for contact in db.Query(Contact).ancestor(self).filter('type', 'email').fetch(1000):
            emails = AddToList(contact.value, emails)
        return emails

    @property
    def photo(self):
        return db.Query(Document).filter('types', 'person_photo').filter('entities', self.key()).get()

    def photo_url(self, size=None, crop=True):
        if self.photo:
            s = '/' + str(size) if size else ''
            c = '/c' if crop else ''
            return self.photo.url + s + c

    @property
    def age(self):
        if self.birth_date:
            today = date.today()
            try: # raised when birth date is February 29 and the current year is not a leap year
                birthday = self.birth_date.replace(year=today.year)
            except ValueError:
                birthday = self.birth_date.replace(year=today.year, day=self.birth_date.day-1)
            if birthday > today:
                return today.year - self.birth_date.year - 1
            else:
                return today.year - self.birth_date.year

    def GetContacts(self):
        return db.Query(Contact).ancestor(self).filter('type !=', 'email').fetch(1000)

    def GetRoles(self):
        if users.is_current_user_admin():
            return Role().all()
        if self.roles:
            return Role().get(self.roles)

    @property
    def current(self, web=None):
        user = users.get_current_user()
        if user:
            person = db.Query(Person).filter('user', user.email()).filter('is_deleted', False).get()
            if not person:
                person = Person()
                person.user = [user.email()]
                person.is_guest = True
                person.put()
            return person

    def current_s(self, web):
        if self.current:
            return self.current
        else:
            sess = Session(web, timeout=86400)
            if 'application_person_key' in sess:
                return Person().get(sess['application_person_key'])

    @property
    def changed(self):
        return datetime.today()
        date = self.last_change.datetime

        document = db.Query(Document).filter('entities', self.key()).filter('types', 'application_document').order('-created').get()
        if document:
            docs_date = document.created
            if docs_date > date:
                date = docs_date

        conversation = db.Query(Conversation).filter('entities', self.key()).filter('types', 'application').get()
        if conversation:
            message = db.Query(Message).ancestor(conversation).order('-created').get()
            if message:
                mess_date = message.created
                if mess_date > date:
                    date = mess_date

        return date

    def add_leecher(self, bubble_key):
        self.leecher = AddToList(bubble_key, self.leecher)
        self.put()
        taskqueue.Task(url='/taskqueue/bubble_change_leecher', params={'action': 'add', 'bubble_key': str(bubble_key), 'person_key': str(self.key())}).add(queue_name='bubble-one-by-one')

    def remove_leecher(self, bubble_key):
        self.leecher.remove(bubble_key)
        self.put()
        taskqueue.Task(url='/taskqueue/bubble_change_leecher', params={'action': 'remove', 'bubble_key': str(bubble_key), 'person_key': str(self.key())}).add(queue_name='bubble-one-by-one')




class Cv(ChangeLogModel): #parent=Person()
    person              = db.ReferenceProperty(Person, collection_name='cv')
    type                = db.StringProperty(choices=['secondary_education', 'higher_education', 'workplace'])
    organisation        = db.StringProperty()
    start               = db.StringProperty()
    end                 = db.StringProperty()
    description         = db.StringProperty()
    model_version       = db.StringProperty(default='A')


class Contact(ChangeLogModel): #parent=Person()
    person              = db.ReferenceProperty(Person, collection_name='contacts')
    type                = db.StringProperty(choices=['email', 'phone', 'address', 'skype'])
    value               = db.StringProperty()
    is_deleted          = db.BooleanProperty(default=False)
    model_version       = db.StringProperty(default='A')

    def AutoFix(self):
        if self.type == 'phone':
            self.value = self.value.strip().replace(' ', '').replace('+372', '')

        if self.type == 'email':
            self.value = self.value.strip().replace(' ', '')

        if self.type == 'skype':
            self.value = self.value.strip().replace(' ', '')

        if self.value.strip():
            self.is_deleted = False
        else:
            self.is_deleted = True

        if self.type == 'email' and (len(self.value) < 5 or self.value.find('@') == -1):
            self.is_deleted = True

        if self.type == 'phone' and len(self.value) < 7:
            self.is_deleted = True

        self.put('autofix')


class Document(ChangeLogModel):
    file            = blobstore.BlobReferenceProperty()
    external_link   = db.StringProperty()
    types           = db.StringListProperty()
    entities        = db.ListProperty(db.Key)
    title           = db.ReferenceProperty(Dictionary, collection_name='document_titles')
    content_type    = db.StringProperty()
    uploader        = db.ReferenceProperty(Person, collection_name='uploaded_documents')
    owners          = db.ListProperty(db.Key)
    editors         = db.ListProperty(db.Key)
    viewers         = db.ListProperty(db.Key)
    created         = db.DateTimeProperty(auto_now_add=True)
    visibility      = db.StringProperty(default='private', choices=['private', 'domain', 'public'])
    model_version   = db.StringProperty(default='A')

    @property
    def url(self):
        return '/document/' + str(self.key())


class Conversation(ChangeLogModel):
    types           = db.StringListProperty()
    entities        = db.ListProperty(db.Key)
    participants    = db.ListProperty(db.Key)
    created         = db.DateTimeProperty(auto_now_add=True)
    model_version   = db.StringProperty(default='A')

    def add_message(self, message, person = None):
        self.participants = AddToList(person, self.participants)
        self.put()

        mes = Message(parent=self)
        if person:
            mes.person = person
        mes.text = message
        mes.put()


class Message(ChangeLogModel): #parent=Conversation()
    person          = db.ReferenceProperty(Person, collection_name='messages')
    text            = db.TextProperty()
    created         = db.DateTimeProperty(auto_now_add=True)
    model_version   = db.StringProperty(default='A')
