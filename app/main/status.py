from main.helper import *


class ShowStatus(myRequestHandler):
    @web.removeslash
    def get(self):
        result = {}
        try:
            self.db_get('SELECT MAX(id) FROM entity;')
            self.json({
                'result': True,
                'time': round(self.request.request_time(), 3)
            })
        except Exception, e:
            self.json({
                'error': e,
                'time': round(self.request.request_time(), 3)
            }, 500)


class ShowStatus2(myRequestHandler):
    @web.removeslash
    def get(self):
        self.json({
            'result': True,
            'time': round(self.request.request_time(), 3)
        })


handlers = [
    (r'/status', ShowStatus),
    (r'/status2', ShowStatus2)
]
