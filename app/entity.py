from tornado import auth, web
from StringIO import StringIO
import logging
import magic
import zipfile

import db
from helper import *


class ShowGroup(myRequestHandler):
    """
    """
    @web.removeslash
    @web.authenticated
    def get(self, entity_definition_keyname=None):
        """
        Show entities page with menu.

        """
        entity_definition_keyname = entity_definition_keyname.strip('/').split('/')[0]
        entity = db.Entity(user_locale=self.get_user_locale(), user_id=self.current_user.id)

        entity_definition = None
        if entity_definition_keyname:
            entity_definition = entity.get_entity_definition(entity_definition_keyname=entity_definition_keyname)

        self.render('entity/start.html',
            page_title = entity_definition[0].label_plural if entity_definition else '',
            menu = entity.get_menu(),
            show_list = True if entity_definition_keyname else False,
            entity_definition = entity_definition_keyname,
            add_definitions = entity.get_definitions_with_default_parent(entity_definition_keyname) if entity_definition_keyname else None,
        )

    @web.authenticated
    def post(self, entity_definition_keyname=None):
        """
        Returns searched Entitiy IDs as JSON.

        """
        entity_definition_keyname = entity_definition_keyname.strip('/').split('/')[0]
        search = self.get_argument('search', None, True)
        self.write({'items': db.Entity(user_locale=self.get_user_locale(), user_id=self.current_user.id).get(ids_only=True, search=search, entity_definition_keyname=entity_definition_keyname, limit=303)})


class ShowListinfo(myRequestHandler):
    """
    """
    @web.authenticated
    def post(self, entity_id=None):
        """
        Returns Entitiy info for list as JSON.

        """
        entity = db.Entity(user_locale=self.get_user_locale(), user_id=self.current_user.id)
        item = entity.get(entity_id=entity_id, limit=1)
        if not item:
            return self.missing()

        self.write({
            'id': item['id'],
            'title': item['displayname'],
            'info': item['displayinfo'],
            'image': item['displaypicture'],
        })


class ShowEntity(myRequestHandler):
    @web.authenticated
    def get(self, entity_id=None, url=None):
        """
        Shows Entitiy info.

        """

        if not entity_id:
            return self.missing()

        entity = db.Entity(user_locale=self.get_user_locale(), user_id=self.current_user.id)
        item = entity.get(entity_id=entity_id, limit=1)

        if not item:
            return self.missing()

        relatives = entity.get_relatives(entity_id=item['id'], relationship_definition_keyname=['child'])
        parents = entity.get_relatives(related_entity_id=item['id'], relationship_definition_keyname='child', reverse_relation=True)
        allowed_childs = entity.get_allowed_childs(entity_id=item['id'])

        can_edit = False if self.current_user.provider == 'application' else True #entity.get_relatives(ids_only=True, entity_id=item['id'], related_entity_id=self.current_user.id, relationship_definition_keyname=['viewer', 'editor', 'owner'])
        can_add = False if self.current_user.provider == 'application' else True #entity.get_relatives(ids_only=True, entity_id=item['id'], related_entity_id=self.current_user.id, relationship_definition_keyname=['viewer', 'editor', 'owner'])

        rating_scale = None
        # rating_scale_list = [x.get('values', []) for x in item.get('properties', []) if x.get('dataproperty', '') == 'rating_scale']
        # if rating_scale_list:
        #     rating_scale = rating_scale_list[0][0]


        self.render('entity/item.html',
            page_title = item['displayname'],
            entity = item,
            relatives = relatives,
            parents = parents.values() if parents else [],
            allowed_childs = allowed_childs,
            rating_scale = rating_scale,
            can_edit = can_edit,
            can_add = can_add,
            is_owner = True,
            add_definitions = entity.get_definitions_with_default_parent(item.get('definition_keyname')) if item.get('definition_keyname') else None,
        )


class DownloadFile(myRequestHandler):
    @web.authenticated
    def get(self, file_ids=None, url=None):
        """
        Download file.

        """
        file_ids = file_ids.split('/')[0]
        files = db.Entity(user_locale=self.get_user_locale(), user_id=self.current_user.id).get_file(file_ids)

        if not files:
            return self.missing()
        if len(files) < 1:
            return self.missing()

        if len(files) > 1:
            f = StringIO()
            zf = zipfile.ZipFile(f, 'w', zipfile.ZIP_DEFLATED)
            for file in files:
                zf.writestr(file.filename, file.file)
            zf.close()
            mime = 'application/octet-stream'
            filename = '%s.zip' % file_ids
            outfile = f.getvalue()
        else:
            file = files[0]
            ms = magic.open(magic.MAGIC_MIME)
            ms.load()
            mime = ms.buffer(file.file)
            ms.close()
            filename = file.filename
            outfile = file.file

        self.add_header('Content-Type', mime)
        self.add_header('Content-Disposition', 'attachment; filename="%s"' % filename)
        self.write(outfile)


class ShowEntityEdit(myRequestHandler):
    @web.authenticated
    def get(self, entity_id=None):
        """
        Shows Entitiy edit form.

        """
        entity = db.Entity(user_locale=self.get_user_locale(), user_id=self.current_user.id)
        item = entity.get(entity_id=entity_id, limit=1, full_definition=True)
        if not item:
            return

        self.render('entity/edit.html',
            entity = item,
            parent_entity_id = '',
            entity_definition_keyname = '',
            actions = [],
            open_after_add = False,
        )


class ShowEntityAdd(myRequestHandler):
    @web.authenticated
    def get(self, entity_id=None, entity_definition_keyname=None):
        """
        Shows Entitiy adding form.

        """
        entity = db.Entity(user_locale=self.get_user_locale(), user_id=self.current_user.id)
        item = entity.get(entity_id=0, entity_definition_keyname=entity_definition_keyname, limit=1, full_definition=True)
        if not item:
            return

        entity_definition = entity.get_entity_definition(entity_definition_keyname=entity_definition_keyname)
        actions = StrToList(entity_definition[0].get('actions_add'))

        self.render('entity/edit.html',
            entity = item,
            parent_entity_id = entity_id,
            entity_definition_keyname = entity_definition_keyname,
            actions = actions,
            open_after_add = True if entity_definition[0].get('open_after_add', 0) == 1 else False,
        )


class ShowEntityRelate(myRequestHandler):
    @web.authenticated
    def get(self, entity_id=None):
        """
        Shows Entitiy relate form.

        """
        entity = db.Entity(user_locale=self.get_user_locale(), user_id=self.current_user.id)
        item = entity.get(entity_id=entity_id, limit=1, full_definition=True)
        if not item:
            return

        self.render('entity/edit.html',
            entity = item,
            parent_entity_id = '',
            entity_definition_keyname = '',
        )


class SaveEntity(myRequestHandler):
    @web.authenticated
    def post(self):
        """
        Saves Entitiy info.

        """
        entity_id                   = self.get_argument('entity_id', default=None, strip=True)
        parent_entity_id            = self.get_argument('parent_entity_id', default=None, strip=True)
        entity_definition_keyname   = self.get_argument('entity_definition_keyname', default=None, strip=True)
        property_definition_keyname = self.get_argument('property_definition_keyname', default=None, strip=True)
        property_id                 = self.get_argument('value_id', default=None, strip=True)
        new_property_id             = property_id
        value                       = self.get_argument('value', default=None, strip=True)
        is_counter                  = self.get_argument('counter', default='false', strip=True)
        is_public                   = self.get_argument('is_public', default='false', strip=True)
        uploaded_file               = self.request.files.get('file', []) if self.request.files.get('file', None) else None

        entity = db.Entity(user_locale=self.get_user_locale(), user_id=self.current_user.id)
        if not entity_id and parent_entity_id and entity_definition_keyname:
            entity_id = entity.create(entity_definition_keyname=entity_definition_keyname, parent_entity_id=parent_entity_id)

        if is_counter.lower() == 'true':
            value = entity.set_counter(entity_id=entity_id)
        elif is_public.lower() == 'true':
            value = True if value.lower() == 'true' else False
            value = entity.set_public(entity_id=entity_id, is_public=value)
        else:
            if uploaded_file:
                value = uploaded_file

            if type(value) is not list:
                value = [value]
            for v in value:
                new_property_id = entity.set_property(entity_id=entity_id, property_definition_keyname=property_definition_keyname, value=v, old_property_id=property_id)

        self.write({
            'entity_id': entity_id,
            'property_definition_keyname': property_definition_keyname,
            'value_id': new_property_id,
            'value': ', '.join([x['filename'] for x in uploaded_file]) if uploaded_file else value
        })


class DeleteFile(myRequestHandler):
    @web.authenticated
    def post(self, file_id=None):
        """
        Delete file.

        Mandatory arguments:
        - property_id
        - entity_id

        Find entity by id and change file property (by id) to None.

        """
        property_id = self.get_argument('property_id', None, True)
        entity_id = self.get_argument('entity_id', None, True)

        entity = db.Entity(user_locale=self.get_user_locale(), user_id=self.current_user.id)
        item = entity.get(entity_id=entity_id, limit=1)
        if not item:
            return self.missing()

        entity.set_property(entity_id=entity_id, old_property_id=property_id)


class DeleteEntity(myRequestHandler):
    @web.authenticated
    def post(self, id=None):
        """
        Delete whole entity.
        Also recursively delete its childs

        Mandatory arguments:
        - entity_id

        1. Find childs by parent entity id and call DeleteEntity on them
        2. Mark entity's deleted property to current time and deleted_by to current user's id.

        """
        entity_id = self.get_argument('entity_id', None, True)

        entity = db.Entity(user_locale=self.get_user_locale(), user_id=self.current_user.id)
        item = entity.get(entity_id=entity_id, limit=1)
        if not item:
            return self.missing()

        entity.delete(entity_id)


class ShareByEmail(myRequestHandler):
    @web.authenticated
    def get(self,  entity_id=None):
        """
        Shows Entitiy share by email form.

        """
        self.render('entity/email.html',
            entity_id = entity_id
        )

    @web.authenticated
    def post(self,  entity_id=None):
        if not self.get_argument('to', None):
            return self.missing()

        to = self.get_argument('to', None)
        message = self.get_argument('message', '')

        entity = db.Entity(user_locale=self.get_user_locale(), user_id=self.current_user.id)
        item = entity.get(entity_id=entity_id, limit=1)
        if not item:
            return self.missing()

        url = 'https://%s/entity/%s/%s' % (self.request.headers.get('Host'), item['definition_keyname'], item['id'])

        self.mail_send(
            to = to,
            subject = item['displayname'],
            message = '%s\n\n%s\n\n%s\n%s' % (message, url, self.current_user.name, self.current_user.email)
        )


class ShowHTMLproperty(myRequestHandler):
    @web.authenticated
    def get(self, entity_id, dataproperty):
        """
        Shows HTML property in modal box

        """

        entity = db.Entity(user_locale=self.get_user_locale(), user_id=self.current_user.id)
        item = entity.get(entity_id=entity_id, limit=1, full_definition=False)
        if not item:
            return

        self.write('\n'.join([x.get('value', '') for x in item.get('properties', {}).get(dataproperty, {}).get('values') if x.get('value', '')]))


handlers = [
    (r'/entity/save', SaveEntity),
    (r'/entity/file-(.*)', DownloadFile),
    (r'/entity/delete-file', DeleteFile),
    (r'/entity/delete-entity', DeleteEntity),
    (r'/entity-(.*)/listinfo', ShowListinfo),
    (r'/entity-(.*)/edit', ShowEntityEdit),
    (r'/entity-(.*)/relate', ShowEntityRelate),
    (r'/entity-(.*)/add/(.*)', ShowEntityAdd),
    (r'/entity-(.*)/share', ShareByEmail),
    (r'/entity-(.*)/html-(.*)', ShowHTMLproperty),
    (r'/entity-(.*)', ShowEntity),
    (r'/entity(.*)', ShowGroup),
]
