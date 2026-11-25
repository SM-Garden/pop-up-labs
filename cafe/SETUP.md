# 단체 커피 주문 — 처음 한 번 설정하기

총무 한 사람만 처음에 한 번 하면 됩니다. 일행은 아무것도 설치하거나 로그인하지 않습니다.

## 1. 무료 서버(Firebase) 만들기 — 약 10분

1. <https://console.firebase.google.com> 에 구글 계정으로 들어갑니다.
2. **프로젝트 추가** → 이름(예: `cafe-order`) 입력 → Google 애널리틱스는 **사용 안 함** → 만들기.
3. 왼쪽 메뉴 **빌드 → Realtime Database** → **데이터베이스 만들기**
   - 위치: **싱가포르(asia-southeast1)** (한국에서 가장 가까움)
   - 보안 규칙: **잠금 모드로 시작** → 사용 설정
4. 위쪽 **규칙** 탭에서 내용을 모두 지우고 아래를 붙여넣은 다음 **게시**를 누릅니다.

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "rooms": {
      "$room": {
        ".read": "$room.matches(/^[a-z2-9]{10}$/)",
        ".write": "$room.matches(/^[a-z2-9]{10}$/)",
        ".validate": "newData.hasChildren(['createdAt'])",
        "title": {
          ".validate": "newData.isString() && newData.val().length <= 30"
        },
        "createdAt": {
          ".validate": "newData.isNumber()"
        },
        "menu": {
          "$i": {
            ".validate": "$i.matches(/^1?[0-9]?[0-9]$/) && newData.hasChildren(['id', 'name', 't'])",
            "id": {
              ".validate": "newData.isString() && newData.val().length <= 20"
            },
            "name": {
              ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 40"
            },
            "t": {
              ".validate": "newData.isString() && newData.val().matches(/^(both|ice|hot|none)$/)"
            },
            "price": {
              ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 1000000"
            },
            "opts": {
              "$j": {
                ".validate": "$j.matches(/^[0-9]$/) && newData.isString() && newData.val().length >= 1 && newData.val().length <= 15"
              }
            },
            "$other": {
              ".validate": false
            }
          }
        },
        "orders": {
          "$order": {
            ".validate": "$order.length <= 30 && newData.hasChildren(['menuId', 'temp', 'ts'])",
            "menuId": {
              ".validate": "newData.isString() && newData.val().length <= 20"
            },
            "temp": {
              ".validate": "newData.val() === 'ICE' || newData.val() === 'HOT' || newData.val() === ''"
            },
            "name": {
              ".validate": "newData.isString() && newData.val().length <= 20"
            },
            "note": {
              ".validate": "newData.isString() && newData.val().length <= 100"
            },
            "got": {
              ".validate": "newData.isBoolean()"
            },
            "ts": {
              ".validate": "newData.isNumber()"
            },
            "by": {
              ".validate": "newData.isString() && newData.val().matches(/^(host|guest)$/)"
            },
            "opt": {
              ".validate": "newData.isString() && newData.val().length <= 15"
            },
            "$other": {
              ".validate": false
            }
          }
        },
        "$other": {
          ".validate": false
        }
      }
    },
    "stats": {
      ".read": true,
      "$day": {
        "$metric": {
          ".write": "newData.exists() && $day.matches(/^20[0-9][0-9]-[01][0-9]-[0-3][0-9]$/) && $metric.matches(/^(rooms|guestOrders|hostOrders|scanAi|scanLocal|hostDevices|guestOpens)$/)",
          ".validate": "newData.isNumber() && newData.val() === (data.exists() ? data.val() : 0) + 1"
        }
      }
    }
  }
}
```

같은 내용이 저장소의 `cafe/database.rules.json` 파일에도 있습니다.

5. **데이터** 탭 맨 위에 보이는 주소를 복사합니다.
   예: `https://cafe-order-1234-default-rtdb.asia-southeast1.firebasedatabase.app`
6. 앱에서 **⚙︎ 설정 → 단톡방 링크용 서버** 칸에 붙여넣고 **저장하고 닫기**를 누릅니다.
   (`index.html` 안의 `DEFAULT_DB = ''` 에 미리 넣어 두면 이 단계도 필요 없습니다.)

> 무료 요금제(Spark)로 충분합니다. 한 번 주문할 때 오가는 데이터는 몇 KB 정도입니다.
> 주문 방마다 추측하기 어려운 10자리 코드를 쓰고, 방 목록은 아무도 볼 수 없습니다.
> 규칙이 저장할 수 있는 항목과 글자 수(이름 20자, 요청사항 100자, 메뉴 이름 40자, 메뉴 200개)를 정해 두어 엉뚱한 데이터가 쌓이지 않습니다.
> 이름과 요청사항 외에 개인정보는 저장하지 않습니다. 사용 통계(`stats`)는 날짜별 숫자만 모으고, 앱 ⚙︎ 설정 → **📊 사용 통계 보기**에서 볼 수 있습니다. **링크 주문 마감하기**를 누르면 서버에서 방이 지워집니다.

## 1-2. (선택) 메뉴판 사진을 AI로 정확하게 읽기 — 약 2분

키가 없어도 사진은 폰 안에서 읽지만, 글씨체가 독특하거나 영어와 한글이 섞인 메뉴판은 AI가 훨씬 정확합니다.

1. 폰 브라우저로 <https://aistudio.google.com/apikey> 에 구글 계정으로 들어갑니다.
2. **API 키 만들기(Create API key)** 를 누르고, 만들어진 키를 복사합니다.
3. 앱 **⚙︎ 설정 → 메뉴판 사진을 AI로 더 정확하게 읽기** 칸에 붙여넣고 **저장하고 닫기**를 누릅니다.

- 무료 등급으로 충분합니다. 메뉴판을 한 번 읽을 때 한 번만 요청합니다.
- 키는 총무 폰에만 저장되고, 단톡방 링크나 서버에는 들어가지 않습니다.
- 키가 있으면 메뉴판 사진이 Google Gemini로 전송됩니다. 무료 등급에서는 Google이 보낸 내용을 서비스 개선에 쓸 수 있으니, 메뉴판 말고 다른 사진은 올리지 마세요.
- AI에 연결하지 못하면 자동으로 폰 안에서 읽습니다.

## 2. 페이지를 인터넷에 올리기

일행이 링크를 열려면 `index.html`이 인터넷 주소에 올라가 있어야 합니다. 아래 둘 중 편한 방법을 쓰세요.

- **GitHub Pages**: 저장소 **Settings → Pages → Branch** 에서 브랜치를 고르고 **Save**를 누릅니다.
  주소는 `https://<아이디>.github.io/<저장소>/cafe/` 형태가 됩니다. (비공개 저장소는 유료 요금제가 필요합니다.)
- **Netlify Drop**: <https://app.netlify.com/drop> 에 `cafe` 폴더를 끌어다 놓으면 바로 주소가 생깁니다.

총무는 그 주소를 폰에서 열고 **홈 화면에 추가**해 두면 앱처럼 쓸 수 있습니다.

## 3. 다른 사람이 이 앱을 쓰려면

| 누가 | 할 일 |
|---|---|
| **일행 (주문하는 사람)** | 아무것도 필요 없어요. 총무가 보낸 카톡 링크를 누르거나, 총무 화면의 QR을 카메라로 찍으면 바로 주문 화면이 열려요. |
| **다른 총무 (다른 모임에서 주문을 모으는 사람)** | 앱의 **⚙ 설정 → 👥 앱 공유하기**로 카톡에 보내 주세요. 받은 사람이 링크를 열면 같은 서버가 자동으로 쓰여요. 그다음 홈 화면에 추가하면 끝이에요. |

- 다른 총무도 내 Firebase를 같이 씁니다. 주문 방마다 다른 10자리 코드를 써서 모임끼리 섞이지 않고, 교회나 소모임 규모라면 무료 사용량으로 충분합니다.
- 메뉴와 AI 키는 사람마다 따로 저장돼요. AI 키가 필요하면 각자 받아서 넣으면 됩니다(1-2 참고).
- 따로 관리하고 싶은 단체라면 1번처럼 자기 Firebase를 만들어 넣으면 됩니다.

### 짧은 링크

단톡방 링크 카드의 **짧은 링크로 만들기**를 켜면 `https://is.gd/xxxxxx` 같은 짧은 주소로 보내요(무료 단축 주소 서비스 is.gd 사용). 짧은 주소를 만들지 못하면 자동으로 원래 링크를 씁니다. 꺼 두어도 링크 안의 서버 주소는 짧은 코드로 줄여서 보냅니다.

## 쓰는 법 요약

| 누가 | 하는 일 |
|---|---|
| 총무 | 맨 위 **모임 이름**을 눌러 적기 → ① 모으기 화면의 **📷 메뉴판 찍기** → 고칠 글자 고치기 → **이 메뉴로 바꾸기** → 카페 이름을 적어 **저장** (다음부터는 **불러오기**로 바로). 더 정확하게 읽으려면 **🤖 AI 앱으로 읽기**: 부탁 문구를 복사해 Gemini 등 AI 앱에 메뉴판 사진과 함께 보내고, 나온 표를 앱에 붙여넣기 (키 필요 없음) |
| 총무 | **단톡방에 링크 보내기** (카톡 공유) 또는 **QR 보여주기** |
| 일행 | 링크 열기 → 음료 한 번 누르기 → 이름 적기 → **주문하기** (다음부터는 이름이 자동으로 채워짐) |
| 폰이 어려운 분 | 총무가 ① 모으기 화면에서 대신 눌러 줌 (잘못 눌렀으면 음료 버튼을 **길게 눌러** 수량 고치기) |
| 총무 | ② 주문하기 → **점원에게 보여주기** |
| 총무 | ③ 나눠주기 → **부르기**로 이름을 크게 보여 주고, 건넨 잔 체크 (일행 화면에도 "받음 ✔" 표시) |

Firebase를 연결하지 않아도 총무 혼자 받는 방식(① ② ③)은 그대로 쓸 수 있습니다.
