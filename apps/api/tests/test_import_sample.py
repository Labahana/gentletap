from gentletap.services.csv_import import SAMPLE_IMPORT_ROWS, build_import_sample_file


def test_build_import_sample_csv():
    content, filename, media_type = build_import_sample_file("csv")
    assert filename.endswith(".csv")
    assert "text/csv" in media_type
    text = content.decode("utf-8")
    assert "client_name" in text
    assert SAMPLE_IMPORT_ROWS[0]["client_name"] in text


def test_build_import_sample_xlsx():
    content, filename, media_type = build_import_sample_file("xlsx")
    assert filename.endswith(".xlsx")
    assert "spreadsheetml" in media_type
    assert len(content) > 100
    assert content[:2] == b"PK"
