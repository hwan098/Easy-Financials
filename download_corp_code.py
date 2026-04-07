"""
Open DART 고유번호(회사코드) 다운로드 스크립트
- ZIP 파일을 다운로드하고 XML 파일을 추출합니다.
"""

import os
import requests
import zipfile
import io
from dotenv import load_dotenv

# .env 파일에서 API 키 로드
load_dotenv()
API_KEY = os.getenv("DART_API_KEY")

# API 설정
API_URL = "https://opendart.fss.or.kr/api/corpCode.xml"
OUTPUT_DIR = "data"
ZIP_FILENAME = "corpCode.zip"
XML_FILENAME = "CORPCODE.xml"


def download_corp_code():
    """고유번호 파일 다운로드 및 압축 해제"""
    
    if not API_KEY or API_KEY == "여기에_발급받은_API_키_입력":
        print("오류: .env 파일에 DART_API_KEY를 설정해주세요.")
        return False
    
    # 출력 디렉토리 생성
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # API 요청
    print("Open DART API에서 고유번호 파일을 다운로드 중...")
    params = {"crtfc_key": API_KEY}
    
    try:
        response = requests.get(API_URL, params=params)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"다운로드 실패: {e}")
        return False
    
    # 응답이 XML(에러)인지 ZIP(성공)인지 확인
    content_type = response.headers.get("Content-Type", "")
    
    if "xml" in content_type or response.content[:5] == b"<?xml":
        print(f"API 오류 응답:\n{response.text}")
        return False
    
    # ZIP 파일 저장
    zip_path = os.path.join(OUTPUT_DIR, ZIP_FILENAME)
    with open(zip_path, "wb") as f:
        f.write(response.content)
    print(f"ZIP 파일 저장 완료: {zip_path}")
    
    # ZIP 파일 압축 해제
    try:
        with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
            zf.extractall(OUTPUT_DIR)
            extracted_files = zf.namelist()
            print(f"압축 해제 완료: {extracted_files}")
    except zipfile.BadZipFile:
        print("오류: 유효하지 않은 ZIP 파일입니다.")
        return False
    
    xml_path = os.path.join(OUTPUT_DIR, XML_FILENAME)
    if os.path.exists(xml_path):
        file_size = os.path.getsize(xml_path) / (1024 * 1024)  # MB
        print(f"XML 파일 크기: {file_size:.2f} MB")
    
    print("다운로드 완료!")
    return True


if __name__ == "__main__":
    download_corp_code()
