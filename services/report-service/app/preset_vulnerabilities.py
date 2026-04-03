from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import VulnerabilityTemplate

PRESET_VULNERABILITIES = [
    {
        "bug_name": "SQL-инъекция",
        "bug_criticality": "critical",
        "cvss_score": 9.8,
        "cvss_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N",
        "bug_description": "<p>Обнаружена возможность внедрения SQL-кода через пользовательский ввод. Злоумышленник может получить несанкционированный доступ к данным, модифицировать или удалить содержимое базы данных.</p>",
        "remediation": "<p>Использовать параметризованные запросы (prepared statements) вместо конкатенации строк. Применять ORM для работы с БД. Внедрить валидацию и санитизацию входных данных.</p>",
        "labels": ["web", "api"],
    },
    {
        "bug_name": "Межсайтовый скриптинг (XSS)",
        "bug_criticality": "high",
        "cvss_score": 6.1,
        "cvss_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:A/VC:N/VI:N/VA:N/SC:L/SI:L/SA:N",
        "bug_description": "<p>Обнаружена возможность внедрения вредоносного JavaScript-кода в страницы приложения. Атакующий может похитить сессионные cookie, выполнить действия от имени пользователя или перенаправить на фишинговый ресурс.</p>",
        "remediation": "<p>Экранировать пользовательский ввод при выводе на страницу. Использовать Content-Security-Policy. Применять автоматическое экранирование в шаблонизаторе. Установить флаг HttpOnly для cookie сессии.</p>",
        "labels": ["web"],
    },
    {
        "bug_name": "Подделка межсайтовых запросов (CSRF)",
        "bug_criticality": "medium",
        "cvss_score": 4.3,
        "cvss_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:A/VC:N/VI:L/VA:N/SC:N/SI:N/SA:N",
        "bug_description": "<p>Приложение не проверяет источник запросов на изменение данных. Злоумышленник может заставить аутентифицированного пользователя выполнить непреднамеренные действия через специально сформированную страницу.</p>",
        "remediation": "<p>Внедрить CSRF-токены для всех форм и запросов на изменение данных. Проверять заголовок Origin/Referer. Использовать атрибут SameSite для cookie.</p>",
        "labels": ["web"],
    },
    {
        "bug_name": "Подделка запросов на стороне сервера (SSRF)",
        "bug_criticality": "high",
        "cvss_score": 7.5,
        "cvss_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N",
        "bug_description": "<p>Обнаружена возможность отправки запросов от имени сервера к произвольным ресурсам. Злоумышленник может получить доступ к внутренним сервисам, метаданным облачного провайдера или провести сканирование внутренней сети.</p>",
        "remediation": "<p>Реализовать белый список разрешённых URL/хостов. Запретить обращения к внутренним IP-адресам (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 169.254.169.254). Использовать DNS-резолвинг с проверкой результата.</p>",
        "labels": ["web", "api"],
    },
    {
        "bug_name": "Небезопасная прямая ссылка на объект (IDOR)",
        "bug_criticality": "high",
        "cvss_score": 7.5,
        "cvss_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N",
        "bug_description": "<p>Обнаружена возможность доступа к объектам других пользователей путём подмены идентификатора в запросе. Отсутствует проверка принадлежности запрашиваемого ресурса текущему пользователю.</p>",
        "remediation": "<p>Реализовать проверку авторизации на уровне каждого объекта. Использовать непредсказуемые идентификаторы (UUID). Внедрить централизованную проверку прав доступа.</p>",
        "labels": ["web", "api", "mobile"],
    },
    {
        "bug_name": "Недостаточная проверка авторизации",
        "bug_criticality": "high",
        "cvss_score": 8.0,
        "cvss_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N",
        "bug_description": "<p>Обнаружено отсутствие или недостаточность проверки прав доступа к функциональности приложения. Пользователь с низким уровнем привилегий может выполнять действия, предназначенные для администратора или других ролей.</p>",
        "remediation": "<p>Внедрить ролевую модель доступа (RBAC). Проверять права на каждом эндпоинте. Использовать принцип наименьших привилегий. Реализовать централизованный middleware авторизации.</p>",
        "labels": ["auth", "web", "api"],
    },
    {
        "bug_name": "Слабая парольная политика",
        "bug_criticality": "medium",
        "cvss_score": 5.3,
        "cvss_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:L/VI:N/VA:N/SC:N/SI:N/SA:N",
        "bug_description": "<p>Приложение допускает использование слабых паролей, не устанавливает требований к минимальной длине, сложности или периоду ротации. Это упрощает подбор учётных данных методом перебора.</p>",
        "remediation": "<p>Установить минимальную длину пароля (не менее 12 символов). Требовать наличие букв разного регистра, цифр и спецсимволов. Внедрить проверку по словарю скомпрометированных паролей. Реализовать блокировку после нескольких неудачных попыток входа.</p>",
        "labels": ["auth", "general"],
    },
    {
        "bug_name": "Отсутствие заголовков безопасности",
        "bug_criticality": "low",
        "cvss_score": 3.7,
        "cvss_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:N/SC:N/SI:N/SA:N",
        "bug_description": "<p>В HTTP-ответах сервера отсутствуют заголовки безопасности (Content-Security-Policy, X-Content-Type-Options, Strict-Transport-Security, X-Frame-Options и др.), что снижает уровень защиты от ряда атак.</p>",
        "remediation": "<p>Добавить заголовки: Content-Security-Policy, X-Content-Type-Options: nosniff, Strict-Transport-Security, X-Frame-Options: DENY, Permissions-Policy. Настроить CSP с запретом inline-скриптов.</p>",
        "labels": ["web", "config"],
    },
    {
        "bug_name": "Использование устаревших версий ПО",
        "bug_criticality": "medium",
        "cvss_score": 5.3,
        "cvss_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:L/VI:N/VA:N/SC:N/SI:N/SA:N",
        "bug_description": "<p>Обнаружено использование устаревших версий серверного ПО, фреймворков или библиотек с известными уязвимостями. Злоумышленник может использовать публично доступные эксплойты для компрометации системы.</p>",
        "remediation": "<p>Обновить компоненты до актуальных версий. Внедрить процесс регулярного обновления зависимостей. Настроить мониторинг CVE для используемых компонентов (Dependabot, Snyk).</p>",
        "labels": ["general", "config"],
    },
    {
        "bug_name": "Раскрытие конфиденциальной информации",
        "bug_criticality": "medium",
        "cvss_score": 5.3,
        "cvss_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:L/VI:N/VA:N/SC:N/SI:N/SA:N",
        "bug_description": "<p>Приложение раскрывает конфиденциальную информацию: внутренние пути, версии ПО, отладочные данные, стектрейсы или данные других пользователей. Это облегчает злоумышленнику планирование дальнейших атак.</p>",
        "remediation": "<p>Отключить отладочный режим в production. Настроить единообразные сообщения об ошибках без технических деталей. Убрать заголовки, раскрывающие версии серверного ПО. Проверить доступность файлов конфигурации.</p>",
        "labels": ["general", "web"],
    },
    {
        "bug_name": "Небезопасное хранение данных на устройстве",
        "bug_criticality": "high",
        "cvss_score": 7.0,
        "cvss_vector": "CVSS:4.0/AV:L/AC:L/AT:N/PR:N/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N",
        "bug_description": "<p>Мобильное приложение хранит конфиденциальные данные (токены, пароли, персональные данные) в незащищённом виде: в SharedPreferences, NSUserDefaults, SQLite без шифрования или во внешнем хранилище.</p>",
        "remediation": "<p>Использовать Android Keystore / iOS Keychain для хранения секретов. Шифровать локальные базы данных (SQLCipher). Не хранить конфиденциальные данные во внешнем хранилище. Очищать данные при выходе из приложения.</p>",
        "labels": ["mobile"],
    },
    {
        "bug_name": "Недостаточная защита транспортного уровня",
        "bug_criticality": "medium",
        "cvss_score": 5.9,
        "cvss_vector": "CVSS:4.0/AV:N/AC:H/AT:N/PR:N/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N",
        "bug_description": "<p>Обнаружено использование незащищённых протоколов передачи данных (HTTP вместо HTTPS), устаревших версий TLS (1.0, 1.1) или слабых шифронаборов. Это позволяет перехватить передаваемые данные.</p>",
        "remediation": "<p>Настроить TLS 1.2+ для всех соединений. Отключить поддержку TLS 1.0/1.1. Использовать сильные шифронаборы. Включить HSTS с длительным max-age. Перенаправлять HTTP на HTTPS.</p>",
        "labels": ["crypto", "general"],
    },
    {
        "bug_name": "Использование слабых криптографических алгоритмов",
        "bug_criticality": "medium",
        "cvss_score": 5.3,
        "cvss_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:L/VI:N/VA:N/SC:N/SI:N/SA:N",
        "bug_description": "<p>Обнаружено использование устаревших или слабых криптографических алгоритмов (MD5, SHA1, DES, RC4). Злоумышленник может расшифровать или подделать защищённые данные.</p>",
        "remediation": "<p>Заменить MD5/SHA1 на SHA-256 или выше. Использовать AES-256 для симметричного шифрования. Применять bcrypt/scrypt/Argon2 для хеширования паролей. Использовать ECDHE для обмена ключами.</p>",
        "labels": ["crypto"],
    },
    {
        "bug_name": "Утечка информации в сообщениях об ошибках",
        "bug_criticality": "low",
        "cvss_score": 3.7,
        "cvss_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:L/VI:N/VA:N/SC:N/SI:N/SA:N",
        "bug_description": "<p>Сообщения об ошибках приложения содержат техническую информацию: стектрейсы, SQL-запросы, пути к файлам, версии ПО. Это помогает злоумышленнику спланировать дальнейшие атаки.</p>",
        "remediation": "<p>Настроить единообразную обработку ошибок с пользовательскими сообщениями. Логировать детали ошибок на сервере, не отправляя их клиенту. Отключить режим отладки в production-окружении.</p>",
        "labels": ["web", "config"],
    },
    {
        "bug_name": "Отсутствие ограничения частоты запросов",
        "bug_criticality": "medium",
        "cvss_score": 5.3,
        "cvss_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:L/SC:N/SI:N/SA:N",
        "bug_description": "<p>API-эндпоинты не имеют ограничения на количество запросов (rate limiting). Это позволяет проводить атаки перебором учётных данных, создавать избыточную нагрузку или злоупотреблять функциональностью.</p>",
        "remediation": "<p>Внедрить rate limiting на критичных эндпоинтах (аутентификация, API). Использовать алгоритм token bucket или sliding window. Возвращать заголовки Retry-After и X-RateLimit-*.</p>",
        "labels": ["api", "web"],
    },
    {
        "bug_name": "XML External Entity (XXE)",
        "bug_criticality": "high",
        "cvss_score": 7.5,
        "cvss_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N",
        "bug_description": "<p>Приложение обрабатывает XML-данные без отключения внешних сущностей. Злоумышленник может читать локальные файлы сервера, выполнять SSRF-атаки или вызвать отказ в обслуживании.</p>",
        "remediation": "<p>Отключить обработку внешних сущностей (DTD) в XML-парсере. Использовать JSON вместо XML где возможно. Валидировать входные XML-данные по схеме (XSD).</p>",
        "labels": ["web", "api"],
    },
    {
        "bug_name": "Небезопасная десериализация",
        "bug_criticality": "critical",
        "cvss_score": 9.8,
        "cvss_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N",
        "bug_description": "<p>Приложение десериализует данные из недоверенных источников без валидации. Злоумышленник может выполнить произвольный код на сервере, передав специально сформированный объект.</p>",
        "remediation": "<p>Не десериализовать данные из недоверенных источников. Использовать безопасные форматы (JSON). Если десериализация необходима — применять белый список допустимых классов. Ограничить привилегии процесса.</p>",
        "labels": ["web", "api"],
    },
    {
        "bug_name": "Обход аутентификации",
        "bug_criticality": "critical",
        "cvss_score": 9.8,
        "cvss_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N",
        "bug_description": "<p>Обнаружена возможность обхода механизмов аутентификации, позволяющая получить доступ к приложению без валидных учётных данных. Может быть вызвано ошибками в логике проверки, недостаточной защитой токенов или предсказуемыми сессиями.</p>",
        "remediation": "<p>Использовать проверенные библиотеки аутентификации. Внедрить многофакторную аутентификацию (MFA). Обеспечить безопасное управление сессиями с использованием криптографически стойких токенов. Проверять аутентификацию на серверной стороне.</p>",
        "labels": ["auth", "web"],
    },
    {
        "bug_name": "Учётные данные по умолчанию",
        "bug_criticality": "high",
        "cvss_score": 7.5,
        "cvss_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N",
        "bug_description": "<p>Обнаружено использование учётных данных по умолчанию (стандартных логинов и паролей) для доступа к административным панелям, базам данных или сервисам. Злоумышленник может получить привилегированный доступ без подбора.</p>",
        "remediation": "<p>Сменить все стандартные учётные данные при развёртывании. Принудительно требовать смену пароля при первом входе. Удалить или заблокировать учётные записи по умолчанию. Внедрить аудит учётных записей.</p>",
        "labels": ["config", "general"],
    },
    {
        "bug_name": "Перехват трафика (MITM)",
        "bug_criticality": "high",
        "cvss_score": 7.4,
        "cvss_vector": "CVSS:4.0/AV:N/AC:H/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N",
        "bug_description": "<p>Приложение уязвимо к атакам типа «человек посередине» из-за отсутствия или неправильной настройки TLS, отсутствия certificate pinning или принятия самоподписанных сертификатов.</p>",
        "remediation": "<p>Обеспечить использование TLS для всех соединений. Внедрить certificate pinning для мобильных приложений. Проверять валидность сертификатов. Не принимать самоподписанные сертификаты в production.</p>",
        "labels": ["network", "crypto"],
    },
]


async def seed_preset_vulnerabilities(db: AsyncSession) -> None:
    result = await db.execute(
        select(VulnerabilityTemplate).where(VulnerabilityTemplate.is_preset == True)  # noqa: E712
    )
    existing = {v.bug_name: v for v in result.scalars().all()}

    for tmpl in PRESET_VULNERABILITIES:
        if tmpl["bug_name"] not in existing:
            db.add(VulnerabilityTemplate(is_preset=True, **tmpl))
        else:
            vt = existing[tmpl["bug_name"]]
            if not vt.labels:
                vt.labels = tmpl.get("labels", [])

    await db.commit()
